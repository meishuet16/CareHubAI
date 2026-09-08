const LEVEL_ORDER = {
  "Immediate review": 4,
  "High attention": 3,
  "Review": 2,
  "Watch": 1,
  "Stable": 0,
  "Acknowledged": -1,
};

const ZONE_LABELS = ["Head", "Back", "Hip", "Leg"];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value) => Math.round(value);

function getHighestZone(zones) {
  const maxPressure = Math.max(...zones);
  return {
    maxPressure,
    index: zones.indexOf(maxPressure),
    label: ZONE_LABELS[zones.indexOf(maxPressure)] || `Zone ${zones.indexOf(maxPressure) + 1}`,
  };
}

function buildPressureState(bed) {
  const pressure = bed.pressure || { zones: [0, 0, 0, 0], highDurationSec: 0, lastMovementMin: 0 };
  const zones = Array.isArray(pressure.zones) ? pressure.zones : [0, 0, 0, 0];
  const highest = getHighestZone(zones);
  const averagePressure = zones.reduce((total, value) => total + value, 0) / zones.length;
  const exposureMin = Math.max(0, pressure.highDurationSec || 0) / 60;
  const context = bed.patientContext || {};

  const persistentHigh = highest.maxPressure >= 70 && exposureMin >= 60;
  const prolongedHigh = highest.maxPressure >= 70 && exposureMin >= 90;
  const movementGap = Math.max(0, pressure.lastMovementMin || 0);
  const cannotSelfReposition = context.canSelfReposition === false;
  const highBaselineRisk = context.pressureRiskBand === "high";
  const constrained = context.fixedPosition === true;

  let level = "Stable";
  const reasons = [];
  let action = "Continue routine pressure monitoring";

  if (prolongedHigh && highBaselineRisk && cannotSelfReposition) {
    level = "High attention";
    reasons.push(`${round(exposureMin)} min sustained pressure near ${highest.label.toLowerCase()}`);
    reasons.push("high clinician-entered pressure-injury risk");
    reasons.push("patient cannot self-reposition");
    action = constrained
      ? "Review pressure exposure against the documented positioning plan"
      : "Assess posture, skin condition and repositioning plan";
  } else if (persistentHigh || (highest.maxPressure >= 70 && movementGap >= 60)) {
    level = "Review";
    reasons.push(`${round(exposureMin)} min elevated pressure near ${highest.label.toLowerCase()}`);
    if (movementGap >= 60) reasons.push(`${round(movementGap)} min since meaningful movement was detected`);
    action = "Review posture and pressure-relief needs";
  } else if (highest.maxPressure >= 55 || movementGap >= 45) {
    level = "Watch";
    reasons.push("pressure pattern is trending above the prototype monitoring baseline");
    action = "Continue monitoring and review at the next appropriate check";
  }

  if (context.pressureRiskBand == null) {
    reasons.push("pressure-risk context is not yet available");
  }

  return {
    level,
    reasons,
    action,
    zones,
    highestZone: highest.index,
    highestZoneLabel: highest.label,
    maxPressure: highest.maxPressure,
    averagePressure: round(averagePressure),
    exposureMin: round(exposureMin),
    movementGapMin: round(movementGap),
    constrained,
  };
}

function buildIvState(bed) {
  const iv = bed.iv || { remainingMl: 0, flowMlPerMin: 0, abnormalFlow: false };
  const timeRemainingMin = iv.flowMlPerMin > 0 ? iv.remainingMl / iv.flowMlPerMin : null;
  const context = bed.patientContext || {};

  let level = "Stable";
  const reasons = [];
  let action = "Continue routine IV monitoring";
  const missingContext = [];

  if (iv.abnormalFlow) {
    level = "Review";
    reasons.push("IV flow interruption or abnormal flow pattern detected");
    action = "Assess the patient, IV bag and line";
    if (!context.infusionContext) missingContext.push("infusion clinical context");
  } else if (timeRemainingMin !== null && timeRemainingMin <= 10) {
    level = "Review";
    reasons.push(`IV is estimated to have about ${round(timeRemainingMin)} min remaining`);
    action = "Review the infusion and prepare the next appropriate step";
  } else if (timeRemainingMin !== null && timeRemainingMin <= 25) {
    level = "Watch";
    reasons.push(`IV is estimated to have about ${round(timeRemainingMin)} min remaining`);
    action = "Monitor IV completion timing";
  }

  return {
    level,
    reasons,
    action,
    remainingMl: Math.max(0, iv.remainingMl || 0),
    flowMlPerMin: Math.max(0, iv.flowMlPerMin || 0),
    abnormalFlow: Boolean(iv.abnormalFlow),
    timeRemainingMin: timeRemainingMin === null ? null : round(timeRemainingMin),
    missingContext,
  };
}

function buildDirectEvents(bed) {
  const events = [];

  if (bed.callActive) {
    events.push({
      type: "Patient call",
      level: "Immediate review",
      reason: "Patient call is active",
      action: "Assess the patient request",
    });
  }

  if (bed.wetnessDetected) {
    events.push({
      type: "Wetness",
      level: "Review",
      reason: "Bedside wetness signal detected",
      action: "Assess skin and bedding condition",
    });
  }

  return events;
}

function highestLevel(levels) {
  return levels.reduce((best, current) =>
    LEVEL_ORDER[current] > LEVEL_ORDER[best] ? current : best,
  "Stable");
}

function buildAttentionExplanation(pressure, iv, directEvents) {
  const reasons = [];
  directEvents.forEach((event) => reasons.push(event.reason));
  if (pressure.level !== "Stable") reasons.push(...pressure.reasons);
  if (iv.level !== "Stable") reasons.push(...iv.reasons);

  if (reasons.length === 0) {
    return "No monitored bedside signal currently needs additional attention";
  }

  return reasons.slice(0, 4).join(" · ");
}

function buildRecommendedAction(pressure, iv, directEvents) {
  if (directEvents.length > 0) {
    const highestEvent = [...directEvents].sort(
      (a, b) => LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level],
    )[0];
    return highestEvent.action;
  }

  if (LEVEL_ORDER[pressure.level] > LEVEL_ORDER[iv.level]) return pressure.action;
  if (LEVEL_ORDER[iv.level] > LEVEL_ORDER[pressure.level]) return iv.action;

  if (pressure.level !== "Stable" && iv.level !== "Stable") {
    return `${pressure.action}; ${iv.action}`;
  }

  return pressure.level !== "Stable" ? pressure.action : iv.action;
}

function buildMissingContext(bed, pressure, iv) {
  const missing = [...iv.missingContext];
  const context = bed.patientContext || {};

  if (pressure.level !== "Stable" && context.pressureRiskBand == null) {
    missing.push("pressure-injury risk band");
  }

  if (context.mobility == null && pressure.level !== "Stable") {
    missing.push("mobility context");
  }

  return [...new Set(missing)];
}

export function evaluateBedAttention(bed) {
  const pressure = buildPressureState(bed);
  const iv = buildIvState(bed);
  const directEvents = buildDirectEvents(bed);
  const activeLevels = [pressure.level, iv.level, ...directEvents.map((event) => event.level)];
  const baseLevel = highestLevel(activeLevels);
  const level = bed.acknowledged && baseLevel !== "Stable" ? "Acknowledged" : baseLevel;
  const missingContext = buildMissingContext(bed, pressure, iv);
  const explanation = buildAttentionExplanation(pressure, iv, directEvents);
  const recommendedAction = buildRecommendedAction(pressure, iv, directEvents);
  const activeSignalCount = [
    pressure.level !== "Stable",
    iv.level !== "Stable",
    directEvents.length > 0,
  ].filter(Boolean).length;

  return {
    ...bed,
    pressure,
    iv,
    directEvents,
    level,
    attentionRank: LEVEL_ORDER[level],
    activeSignalCount,
    explanation,
    recommendedAction,
    missingContext,
    confidence: missingContext.length > 0 ? "Limited context" : "Context available",
  };
}

function compareAttention(first, second) {
  const levelDifference = second.attentionRank - first.attentionRank;
  if (levelDifference) return levelDifference;

  const signalDifference = second.activeSignalCount - first.activeSignalCount;
  if (signalDifference) return signalDifference;

  const pressureExposureDifference = second.pressure.exposureMin - first.pressure.exposureMin;
  if (pressureExposureDifference) return pressureExposureDifference;

  return first.id.localeCompare(second.id);
}

export function buildAttentionDashboardState(beds) {
  const evaluatedBeds = beds.map(evaluateBedAttention);
  const attentionQueue = evaluatedBeds
    .filter((bed) => bed.level !== "Stable" && bed.level !== "Acknowledged")
    .sort(compareAttention);
  const focusBed = attentionQueue[0] || evaluatedBeds[0];

  return {
    beds: evaluatedBeds,
    attentionQueue,
    focusBed,
    summary: {
      totalBeds: evaluatedBeds.length,
      immediate: evaluatedBeds.filter((bed) => bed.level === "Immediate review").length,
      high: evaluatedBeds.filter((bed) => bed.level === "High attention").length,
      review: evaluatedBeds.filter((bed) => bed.level === "Review").length,
      watch: evaluatedBeds.filter((bed) => bed.level === "Watch").length,
      stable: evaluatedBeds.filter((bed) => bed.level === "Stable").length,
      activeNeeds: attentionQueue.length,
      ivWatch: evaluatedBeds.filter((bed) => bed.iv.level !== "Stable").length,
    },
  };
}

export function acknowledgeBed(beds, bedId) {
  return beds.map((bed) => (bed.id === bedId ? { ...bed, acknowledged: true } : bed));
}

export function normalizeBedsidePacket(packet) {
  if (!packet || !packet.bedId) return null;

  const pressureZones = Array.isArray(packet.pressure?.zones)
    ? packet.pressure.zones.slice(0, 4).map((value) => clamp(Number(value) || 0, 0, 100))
    : null;

  if (!pressureZones || pressureZones.length !== 4) return null;

  return {
    bedId: String(packet.bedId),
    pressure: {
      zones: pressureZones.map(round),
      highDurationSec: round(clamp(Number(packet.pressure?.highDurationSec) || 0, 0, 14400)),
      lastMovementMin: round(clamp(Number(packet.pressure?.lastMovementMin) || 0, 0, 360)),
    },
    iv: {
      remainingMl: round(clamp(Number(packet.iv?.remainingMl) || 0, 0, 1000)),
      flowMlPerMin: round(clamp(Number(packet.iv?.flowMlPerMin) || 0, 0, 100)),
      abnormalFlow: packet.iv?.abnormalFlow === true || packet.iv?.abnormalFlow === "yes",
    },
    wetnessDetected: packet.wetnessDetected === true,
    callActive: packet.callActive === true,
  };
}

export function applyBedsidePacket(beds, packet) {
  const normalized = normalizeBedsidePacket(packet);
  if (!normalized) return beds;

  return beds.map((bed) =>
    bed.id === normalized.bedId
      ? {
          ...bed,
          pressure: normalized.pressure,
          iv: normalized.iv,
          wetnessDetected: normalized.wetnessDetected,
          callActive: normalized.callActive,
          acknowledged: false,
        }
      : bed,
  );
}
