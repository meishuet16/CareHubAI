const initialBeds = [
  {
    id: "Bed 01",
    patient: "Aisyah Rahman",
    pressure: { zones: [18, 26, 34, 29], highDurationSec: 0, lastMovementMin: 6 },
    iv: { remainingMl: 210, flowMlPerMin: 6, abnormalFlow: false },
    acknowledged: false,
  },
  {
    id: "Bed 02",
    patient: "Tan Mei Ling",
    pressure: { zones: [24, 36, 82, 88], highDurationSec: 84, lastMovementMin: 42 },
    iv: { remainingMl: 190, flowMlPerMin: 5, abnormalFlow: false },
    acknowledged: false,
  },
  {
    id: "Bed 03",
    patient: "Kumar Velu",
    pressure: { zones: [32, 42, 51, 47], highDurationSec: 22, lastMovementMin: 14 },
    iv: { remainingMl: 58, flowMlPerMin: 7, abnormalFlow: false },
    acknowledged: false,
  },
  {
    id: "Bed 04",
    patient: "Nur Iman",
    pressure: { zones: [22, 28, 31, 27], highDurationSec: 0, lastMovementMin: 9 },
    iv: { remainingMl: 130, flowMlPerMin: 0, abnormalFlow: true },
    acknowledged: false,
  },
];

let beds = structuredClone(initialBeds);
let selectedBedId = "Bed 02";

const elements = {
  shiftTime: document.querySelector("#shift-time"),
  totalCount: document.querySelector("#total-count"),
  urgentCount: document.querySelector("#urgent-count"),
  monitorCount: document.querySelector("#monitor-count"),
  stableCount: document.querySelector("#stable-count"),
  ivWatchCount: document.querySelector("#iv-watch-count"),
  avgPriority: document.querySelector("#avg-priority"),
  decisionHeadline: document.querySelector("#decision-headline"),
  criticalTitle: document.querySelector("#critical-title"),
  criticalStatus: document.querySelector("#critical-status"),
  criticalAction: document.querySelector("#critical-action"),
  criticalReason: document.querySelector("#critical-reason"),
  pressureMap: document.querySelector("#pressure-map"),
  liveScore: document.querySelector("#live-score"),
  liveIv: document.querySelector("#live-iv"),
  liveAge: document.querySelector("#live-age"),
  rawSignalCopy: document.querySelector("#raw-signal-copy"),
  riskPatternCopy: document.querySelector("#risk-pattern-copy"),
  responseCopy: document.querySelector("#response-copy"),
  priorityList: document.querySelector("#priority-list"),
  bedMap: document.querySelector("#bed-map"),
  prototypeFlow: document.querySelector("#prototype-flow"),
  eventLog: document.querySelector("#event-log"),
  simulatePressure: document.querySelector("#simulate-pressure"),
  simulateIv: document.querySelector("#simulate-iv"),
  acknowledgeSelected: document.querySelector("#acknowledge-selected"),
  simulateReset: document.querySelector("#simulate-reset"),
};

function render() {
  const state = buildDashboardState(beds);
  const priorityBed = state.criticalBed;
  const selectedBed = state.beds.find((bed) => bed.id === selectedBedId) || priorityBed;
  const focusBed = selectedBed.level === "Stable" ? priorityBed : selectedBed;
  selectedBedId = focusBed.id;

  renderClock();
  renderSummary(state.summary);
  renderPrimaryDecision(state.nurseDecision, focusBed);
  renderPressureMap(focusBed);
  renderAiSummary(focusBed);
  renderPriorityList(state.priorityQueue, focusBed.id);
  renderBedMap(state.beds, focusBed.id);
  renderPrototypeFlow(state.prototypeFlow);
  renderEventLog(state.eventLog);
}

function renderClock() {
  elements.shiftTime.textContent = new Intl.DateTimeFormat("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date());
}

function renderSummary(summary) {
  elements.totalCount.textContent = summary.totalBeds;
  elements.urgentCount.textContent = summary.urgent;
  elements.monitorCount.textContent = summary.monitor;
  elements.stableCount.textContent = summary.stable;
  elements.ivWatchCount.textContent = summary.ivEndingSoon;
  elements.avgPriority.textContent = summary.avgPriorityScore;
}

function renderPrimaryDecision(decision, bed) {
  elements.decisionHeadline.textContent =
    decision.primaryBedId === bed.id ? decision.headline : `Review ${bed.id}`;
  elements.criticalTitle.textContent = `${bed.id} · ${bed.patient}`;
  elements.criticalStatus.className = `status-pill ${bed.level.toLowerCase()}`;
  elements.criticalStatus.textContent = bed.level;
  elements.criticalAction.textContent = bed.recommendedAction;
  elements.criticalReason.textContent = bed.explanation;
  elements.liveScore.textContent = `${bed.priorityScore} / 100`;
  elements.liveIv.textContent =
    bed.iv.timeRemainingMin === null ? "Flow paused" : `${bed.iv.timeRemainingMin} min`;
  elements.liveAge.textContent = bed.alertAgeLabel;
}

function renderPressureMap(bed) {
  elements.pressureMap.replaceChildren();
  bed.pressure.zones.forEach((value, index) => {
    const zone = document.createElement("div");
    zone.className = `pressure-zone ${getZoneClass(value)}`;
    zone.innerHTML = `<span>Zone ${index + 1}</span><strong>${value}</strong>`;
    elements.pressureMap.append(zone);
  });
}

function renderAiSummary(bed) {
  elements.rawSignalCopy.textContent = `Pressure ${bed.pressure.level} · IV ${bed.iv.level}`;
  elements.riskPatternCopy.textContent = `${bed.level} · Score ${bed.priorityScore}`;
  elements.responseCopy.textContent = bed.recommendedAction;
}

function renderPriorityList(queue, focusBedId) {
  elements.priorityList.replaceChildren();
  const otherBeds = queue.filter((bed) => bed.id !== focusBedId);

  if (otherBeds.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No other active alerts.";
    elements.priorityList.append(empty);
    return;
  }

  otherBeds.forEach((bed, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `queue-item ${bed.level.toLowerCase()}`;
    item.dataset.select = bed.id;
    item.innerHTML = `
      <span>${index + 2}. ${bed.id}</span>
      <strong>${bed.recommendedAction}</strong>
      <small>${bed.explanation}</small>
    `;
    elements.priorityList.append(item);
  });
}

function renderBedMap(enrichedBeds, focusBedId) {
  elements.bedMap.replaceChildren();
  enrichedBeds.forEach((bed) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.dataset.select = bed.id;
    tile.className = `bed-tile ${bed.level.toLowerCase()} ${bed.id === focusBedId ? "selected" : ""}`;
    tile.innerHTML = `
      <span>${bed.id}</span>
      <strong>${bed.level}</strong>
      <small>${bed.recommendedAction}</small>
      <b>${bed.priorityScore}</b>
    `;
    elements.bedMap.append(tile);
  });
}

function renderPrototypeFlow(flow) {
  elements.prototypeFlow.replaceChildren();
  flow.forEach((item, index) => {
    const node = document.createElement("article");
    node.innerHTML = `
      <span>${String(index + 1).padStart(2, "0")}</span>
      <strong>${item.label}</strong>
      <small>${item.detail}</small>
    `;
    elements.prototypeFlow.append(node);
  });
}

function renderEventLog(events) {
  elements.eventLog.replaceChildren();
  events.forEach((event) => {
    const item = document.createElement("article");
    item.className = `event-item ${event.level.toLowerCase()}`;
    item.innerHTML = `
      <strong>${event.bedId} · ${event.level}</strong>
      <p>${event.message}</p>
      <small>${event.action}</small>
    `;
    elements.eventLog.append(item);
  });
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(value);
}

function calculatePressureRisk(pressure) {
  const maxPressure = Math.max(...pressure.zones);
  const averagePressure =
    pressure.zones.reduce((total, value) => total + value, 0) / pressure.zones.length;
  const intensityScore = clamp(maxPressure * 0.75 + averagePressure * 0.25);
  const durationScore = clamp((pressure.highDurationSec / 75) * 100);
  const noMovementScore = clamp((pressure.lastMovementMin / 40) * 100);
  const score = round(intensityScore * 0.5 + durationScore * 0.3 + noMovementScore * 0.2);

  return {
    score,
    level: score >= 70 ? "High" : score >= 40 ? "Medium" : "Low",
    zones: pressure.zones,
    highestZone: pressure.zones.indexOf(maxPressure),
    maxPressure,
    averagePressure: round(averagePressure),
  };
}

function calculateIvRisk(iv) {
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
    level: score >= 70 ? "Urgent" : score >= 40 ? "Monitor" : "Normal",
    timeRemainingMin: Number.isFinite(timeRemainingMin) ? round(timeRemainingMin) : null,
    remainingMl: iv.remainingMl,
    abnormalFlow: iv.abnormalFlow,
  };
}

function calculateBedRisk(bed) {
  const pressure = calculatePressureRisk(bed.pressure);
  const iv = calculateIvRisk(bed.iv);
  const multiRiskBonus = pressure.score >= 40 && iv.score >= 40 ? 12 : 0;
  const priorityScore = clamp(round(pressure.score * 0.55 + iv.score * 0.35 + multiRiskBonus));
  const baseLevel =
    pressure.level === "High" || iv.level === "Urgent"
      ? "Urgent"
      : priorityScore >= 70
        ? "Urgent"
        : priorityScore >= 40
          ? "Monitor"
          : "Stable";
  const level = bed.acknowledged && baseLevel !== "Stable" ? "Acknowledged" : baseLevel;

  return {
    ...bed,
    pressure,
    iv,
    priorityScore,
    level,
    explanation: buildExplanation(pressure, iv),
    recommendedAction: buildRecommendedAction(pressure, iv),
    alertAgeLabel: buildAlertAgeLabel(level, bed.pressure.highDurationSec),
  };
}

function buildDashboardState(sourceBeds) {
  const enrichedBeds = sourceBeds.map(calculateBedRisk);
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

function acknowledgeAlert(sourceBeds, bedId) {
  return sourceBeds.map((bed) => (bed.id === bedId ? { ...bed, acknowledged: true } : bed));
}

function comparePriority(first, second) {
  const severity = { Urgent: 3, Monitor: 2, Stable: 1, Acknowledged: 0 };
  const severityDifference = severity[second.level] - severity[first.level];
  return severityDifference || second.priorityScore - first.priorityScore;
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

function buildEventLog(enrichedBeds) {
  return enrichedBeds
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

function buildSensorPipeline() {
  return [
    { label: "Pressure Mat", status: "Live", detail: "4-zone pressure input" },
    { label: "IV Sensor", status: "Live", detail: "Fluid trend signal" },
    { label: "ESP32 Edge", status: "Online", detail: "Bedside data relay" },
    { label: "AI Triage", status: "Ready", detail: "Priority scoring" },
  ];
}

function buildPrototypeFlow() {
  return [
    { label: "Pressure mat", detail: "Detect sustained pressure zones" },
    { label: "IV sensor", detail: "Track fluid trend or abnormal flow" },
    { label: "AI triage", detail: "Rank bedside risks by urgency" },
    { label: "Nurse action", detail: "Check the highest-priority bed first" },
  ];
}

function getZoneClass(value) {
  if (value >= 70) return "zone-high";
  if (value >= 40) return "zone-medium";
  return "zone-low";
}

function selectBed(bedId) {
  selectedBedId = bedId;
  render();
}

elements.bedMap.addEventListener("click", (event) => {
  const tile = event.target.closest("[data-select]");
  if (!tile) return;
  selectBed(tile.dataset.select);
});

elements.priorityList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-select]");
  if (!item) return;
  selectBed(item.dataset.select);
});

elements.simulatePressure.addEventListener("click", () => {
  beds = beds.map((bed) =>
    bed.id === selectedBedId
      ? {
          ...bed,
          pressure: { zones: [24, 38, 86, 91], highDurationSec: 78, lastMovementMin: 39 },
          acknowledged: false,
        }
      : bed,
  );
  render();
});

elements.simulateIv.addEventListener("click", () => {
  beds = beds.map((bed) =>
    bed.id === selectedBedId
      ? {
          ...bed,
          iv: { remainingMl: 42, flowMlPerMin: 6, abnormalFlow: false },
          acknowledged: false,
        }
      : bed,
  );
  render();
});

elements.acknowledgeSelected.addEventListener("click", () => {
  beds = acknowledgeAlert(beds, selectedBedId);
  render();
});

elements.simulateReset.addEventListener("click", () => {
  beds = structuredClone(initialBeds);
  selectedBedId = "Bed 02";
  render();
});

render();
