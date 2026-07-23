const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const round = (value) => Math.round(value);

const getRiskLevel = (score) => {
  if (score >= 70) return "Urgent";
  if (score >= 40) return "Monitor";
  return "Stable";
};

const getPressureLevel = (score) => {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
};

const getIvLevel = (score) => {
  if (score >= 70) return "Urgent";
  if (score >= 40) return "Monitor";
  return "Normal";
};

export function calculatePressureRisk(pressure) {
  const maxPressure = Math.max(...pressure.zones);
  const averagePressure =
    pressure.zones.reduce((total, value) => total + value, 0) / pressure.zones.length;
  const intensityScore = clamp(maxPressure * 0.75 + averagePressure * 0.25);
  const durationScore = clamp((pressure.highDurationSec / 75) * 100);
  const noMovementScore = clamp((pressure.lastMovementMin / 40) * 100);
  const score = round(intensityScore * 0.5 + durationScore * 0.3 + noMovementScore * 0.2);

  return {
    score,
    level: getPressureLevel(score),
    zones: pressure.zones,
    highestZone: pressure.zones.indexOf(maxPressure),
    maxPressure,
    averagePressure: round(averagePressure),
  };
}

export function calculateIvRisk(iv) {
  if (iv.abnormalFlow) {
    return {
      score: 82,
      level: "Urgent",
      timeRemainingMin: iv.flowMlPerMin > 0 ? round(iv.remainingMl / iv.flowMlPerMin) : null,
      remainingMl: iv.remainingMl,
      abnormalFlow: true,
    };
  }

  const timeRemainingMin = iv.flowMlPerMin > 0 ? iv.remainingMl / iv.flowMlPerMin : Infinity;
  const lowFluidScore = clamp(((160 - iv.remainingMl) / 160) * 100);
  const timeScore = Number.isFinite(timeRemainingMin)
    ? clamp(((25 - timeRemainingMin) / 25) * 100)
    : 45;
  const score = round(lowFluidScore * 0.55 + timeScore * 0.45);

  return {
    score,
    level: getIvLevel(score),
    timeRemainingMin: Number.isFinite(timeRemainingMin) ? round(timeRemainingMin) : null,
    remainingMl: iv.remainingMl,
    abnormalFlow: iv.abnormalFlow,
  };
}

export function calculateBedRisk(bed) {
  const pressure = calculatePressureRisk(bed.pressure);
  const iv = calculateIvRisk(bed.iv);
  const multiRiskBonus = pressure.score >= 40 && iv.score >= 40 ? 12 : 0;
  const priorityScore = clamp(round(pressure.score * 0.55 + iv.score * 0.35 + multiRiskBonus));
  const baseLevel =
    pressure.level === "High" || iv.level === "Urgent" ? "Urgent" : getRiskLevel(priorityScore);
  const level = bed.acknowledged && baseLevel !== "Stable" ? "Acknowledged" : baseLevel;
  const explanation = buildExplanation(pressure, iv);
  const recommendedAction = buildRecommendedAction(pressure, iv);

  return {
    ...bed,
    pressure,
    iv,
    priorityScore,
    level,
    explanation,
    recommendedAction,
    alertAgeLabel: buildAlertAgeLabel(level, bed.pressure.highDurationSec),
  };
}

export function buildDashboardState(beds) {
  const enrichedBeds = beds.map(calculateBedRisk);
  const priorityQueue = enrichedBeds
    .filter((bed) => bed.level !== "Stable" && bed.level !== "Acknowledged")
    .sort(comparePriority);

  return {
    beds: enrichedBeds,
    priorityQueue,
    criticalBed: priorityQueue[0] || enrichedBeds[0],
    nextAction: buildNextAction(priorityQueue[0]),
    nurseDecision: buildNurseDecision(priorityQueue),
    summary: {
      urgent: enrichedBeds.filter((bed) => bed.level === "Urgent").length,
      monitor: enrichedBeds.filter((bed) => bed.level === "Monitor").length,
      stable: enrichedBeds.filter((bed) => bed.level === "Stable").length,
      acknowledged: enrichedBeds.filter((bed) => bed.level === "Acknowledged").length,
      totalBeds: enrichedBeds.length,
      activeBeds: enrichedBeds.filter((bed) => bed.level !== "Stable").length,
      ivEndingSoon: enrichedBeds.filter((bed) => bed.iv.level !== "Normal").length,
      avgPriorityScore: round(
        enrichedBeds.reduce((total, bed) => total + bed.priorityScore, 0) / enrichedBeds.length,
      ),
    },
    eventLog: buildEventLog(enrichedBeds),
    sensorPipeline: buildSensorPipeline(),
    prototypeFlow: buildPrototypeFlow(),
  };
}

function comparePriority(first, second) {
  const severity = { Urgent: 3, Monitor: 2, Stable: 1, Acknowledged: 0 };
  const severityDifference = severity[second.level] - severity[first.level];
  return severityDifference || second.priorityScore - first.priorityScore;
}

export function acknowledgeAlert(beds, bedId) {
  return beds.map((bed) => (bed.id === bedId ? { ...bed, acknowledged: true } : bed));
}

export function normalizeHardwareReading(reading) {
  if (!reading || !reading.pressure || !reading.iv) return null;
  if (!Array.isArray(reading.pressure.zones) || reading.pressure.zones.length !== 4) return null;

  return {
    bedId: String(reading.bedId || "Bed 01"),
    pressure: {
      zones: reading.pressure.zones.map((value) => round(clamp(toNumber(value), 0, 100))),
      highDurationSec: round(clamp(toNumber(reading.pressure.highDurationSec), 0, 3600)),
      lastMovementMin: round(clamp(toNumber(reading.pressure.lastMovementMin), 0, 240)),
    },
    iv: {
      remainingMl: round(clamp(toNumber(reading.iv.remainingMl), 0, 1000)),
      flowMlPerMin: round(clamp(toNumber(reading.iv.flowMlPerMin), 0, 100)),
      abnormalFlow: reading.iv.abnormalFlow === true || reading.iv.abnormalFlow === "yes",
    },
  };
}

export function applyHardwareReading(beds, reading) {
  const normalized = normalizeHardwareReading(reading);
  if (!normalized) return beds;

  return beds.map((bed) =>
    bed.id === normalized.bedId
      ? {
          ...bed,
          pressure: normalized.pressure,
          iv: normalized.iv,
          acknowledged: false,
        }
      : bed,
  );
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function buildExplanation(pressure, iv) {
  const notes = [];
  if (pressure.level === "High") {
    notes.push(`pressure is high in zone ${pressure.highestZone + 1}`);
  } else if (pressure.level === "Medium") {
    notes.push(`pressure pattern needs monitoring in zone ${pressure.highestZone + 1}`);
  }

  if (iv.abnormalFlow) {
    notes.push("IV flow pattern is abnormal");
  } else if (iv.level !== "Normal" && iv.timeRemainingMin !== null) {
    notes.push(`IV is predicted to finish in ${iv.timeRemainingMin} min`);
  }

  return notes.length > 0 ? notes.join(" and ") : "All tracked bedside signals are stable";
}

function buildRecommendedAction(pressure, iv) {
  const actions = [];
  if (pressure.level === "High") actions.push("Reposition patient");
  if (pressure.level === "Medium") actions.push("Check posture during next round");
  if (iv.level === "Urgent") actions.push("Check IV bag");
  if (iv.level === "Monitor") actions.push("Prepare IV replacement");

  return actions.length > 0 ? actions.join(" and ") : "No immediate action needed";
}

function buildAlertAgeLabel(level, highDurationSec) {
  if (level === "Stable") return "No active alert";
  if (highDurationSec > 0) return `${highDurationSec} sec`;
  return "New alert";
}

function buildEventLog(beds) {
  return beds
    .filter((bed) => bed.level === "Urgent" || bed.level === "Monitor")
    .sort(comparePriority)
    .map((bed) => ({
      bedId: bed.id,
      level: bed.level,
      message: `${bed.id}: ${bed.explanation}`,
      action: bed.recommendedAction,
    }));
}

function buildNextAction(criticalBed) {
  if (!criticalBed) {
    return {
      title: "All beds stable",
      reason: "No active pressure or IV alerts require immediate nurse action.",
      action: "Continue routine monitoring",
    };
  }

  return {
    title: `${criticalBed.id} needs attention`,
    reason: criticalBed.explanation,
    action: criticalBed.recommendedAction,
  };
}

function buildSensorPipeline() {
  return [
    { label: "Pressure Mat", status: "Live", detail: "4-zone pressure input" },
    { label: "IV Sensor", status: "Live", detail: "Fluid trend signal" },
    { label: "ESP32 Edge", status: "Online", detail: "Bedside data relay" },
    { label: "AI Triage", status: "Ready", detail: "Priority scoring" },
  ];
}

function buildNurseDecision(priorityQueue) {
  const primary = priorityQueue[0];
  if (!primary) {
    return {
      primaryBedId: null,
      headline: "No urgent bedside checks",
      why: "All monitored pressure and IV signals are stable.",
      action: "Continue routine ward monitoring",
      queue: [],
    };
  }

  return {
    primaryBedId: primary.id,
    headline: `Check ${primary.id} first`,
    why: primary.explanation,
    action: primary.recommendedAction,
    queue: priorityQueue.slice(1),
  };
}

function buildPrototypeFlow() {
  return [
    { label: "Pressure mat", detail: "Detect sustained pressure zones" },
    { label: "IV sensor", detail: "Track fluid trend or abnormal flow" },
    { label: "AI triage", detail: "Rank bedside risks by urgency" },
    { label: "Nurse action", detail: "Check the highest-priority bed first" },
  ];
}
