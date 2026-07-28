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
let hardwareMode = false;
let hardwareStatus = {
  connected: false,
  message: "Waiting in simulated mode",
  lastUpdatedAt: null,
};
let latestHardwarePacket = { mode: "simulated" };

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
  ivFill: document.querySelector("#iv-fill"),
  ivStatusLabel: document.querySelector("#iv-status-label"),
  liveScore: document.querySelector("#live-score"),
  liveIv: document.querySelector("#live-iv"),
  liveAge: document.querySelector("#live-age"),
  nurseTasks: document.querySelector("#nurse-tasks"),
  rawSignalCopy: document.querySelector("#raw-signal-copy"),
  riskPatternCopy: document.querySelector("#risk-pattern-copy"),
  responseCopy: document.querySelector("#response-copy"),
  aiBreakdown: document.querySelector("#ai-breakdown"),
  priorityList: document.querySelector("#priority-list"),
  bedMap: document.querySelector("#bed-map"),
  prototypeFlow: document.querySelector("#prototype-flow"),
  eventLog: document.querySelector("#event-log"),
  hardwareModeLabel: document.querySelector("#hardware-mode-label"),
  hardwareStatusCopy: document.querySelector("#hardware-status-copy"),
  lastUpdateCopy: document.querySelector("#last-update-copy"),
  hardwarePacket: document.querySelector("#hardware-packet"),
  toggleHardware: document.querySelector("#toggle-hardware"),
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
  const visualization = buildVisualizationState(state.beds, focusBed.id);
  selectedBedId = focusBed.id;

  renderClock();
  renderSummary(state.summary);
  renderPrimaryDecision(state.nurseDecision, focusBed);
  renderPressureMap(visualization.pressureZones);
  renderIvBag(visualization.ivBag);
  renderNurseTasks(focusBed.nurseTasks);
  renderAiSummary(focusBed, visualization.triagePipeline);
  renderPriorityList(state.priorityQueue, focusBed.id);
  renderBedMap(visualization);
  renderPrototypeFlow(state.prototypeFlow);
  renderEventLog(state.eventLog);
  renderHardwareStatus();
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

function renderPressureMap(pressureZones) {
  elements.pressureMap.replaceChildren();
  pressureZones.forEach((pressureZone) => {
    const zoneElement = document.createElement("div");
    zoneElement.className = `pressure-zone ${getZoneClass(pressureZone.value)}`;
    zoneElement.innerHTML = `<span>${pressureZone.label}</span><strong>${pressureZone.value}</strong><small>${pressureZone.level}</small>`;
    elements.pressureMap.append(zoneElement);
  });
}

function renderIvBag(ivBag) {
  elements.ivFill.style.height = `${ivBag.fillPercent}%`;
  elements.ivFill.className = `iv-fill ${ivBag.status.toLowerCase()}`;
  elements.ivStatusLabel.textContent = `${ivBag.status} · ${ivBag.remainingMl} ml`;
}

function renderNurseTasks(tasks) {
  elements.nurseTasks.replaceChildren();
  tasks.forEach((task, index) => {
    const item = document.createElement("article");
    item.innerHTML = `
      <span>${index + 1}</span>
      <div>
        <strong>${task.label}</strong>
        <small>${task.detail}</small>
      </div>
    `;
    elements.nurseTasks.append(item);
  });
}

function renderAiSummary(bed, triagePipeline) {
  elements.rawSignalCopy.textContent = `Pressure ${bed.pressure.level} · IV ${bed.iv.level}`;
  elements.riskPatternCopy.textContent = `${bed.level} · Score ${bed.priorityScore}`;
  elements.responseCopy.textContent = bed.recommendedAction;
  elements.aiBreakdown.replaceChildren();
  triagePipeline.forEach((item, index) => {
    const row = document.createElement("article");
    row.className = index === 2 ? "active" : "";
    row.innerHTML = `
      <span>${item.label}</span>
      <strong>${item.value}</strong>
      <small>${item.status}</small>
    `;
    elements.aiBreakdown.append(row);
  });
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
    item.className = `queue-item dispatch-ticket ${bed.level.toLowerCase()}`;
    item.dataset.select = bed.id;
    item.innerHTML = `
      <span>${index + 2}. ${bed.id}</span>
      <strong>${bed.recommendedAction}</strong>
      <small>${bed.explanation}</small>
    `;
    elements.priorityList.append(item);
  });
}

function renderBedMap(visualization) {
  elements.bedMap.replaceChildren();
  const route = document.createElement("div");
  route.className = "nurse-route";
  route.innerHTML = `
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <line
        x1="${visualization.nurseRoute.from.x + 10}"
        y1="${visualization.nurseRoute.from.y + 8}"
        x2="${visualization.nurseRoute.to.x + 15}"
        y2="${visualization.nurseRoute.to.y + 12}"
      />
    </svg>
  `;
  elements.bedMap.append(route);

  const station = document.createElement("div");
  station.className = "nurse-station";
  station.style.left = `${visualization.nurseRoute.from.x}%`;
  station.style.top = `${visualization.nurseRoute.from.y}%`;
  station.textContent = visualization.nurseRoute.from.label;
  elements.bedMap.append(station);

  visualization.wardBeds.forEach((bed) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.dataset.select = bed.id;
    tile.className = `bed-tile twin-bed ${bed.level.toLowerCase()} ${bed.twinVariant} ${bed.selected ? "selected" : ""}`;
    tile.style.left = `${bed.x}%`;
    tile.style.top = `${bed.y}%`;
    tile.innerHTML = `
      <div class="bed-object" aria-hidden="true">
        <div class="iv-mini-pole"><i></i></div>
        <div class="bed-frame">
          <span class="bed-pillow"></span>
          <span class="bed-mattress"></span>
          <span class="bed-pressure-strip ${bed.pressureStatus.toLowerCase()}"></span>
        </div>
      </div>
      <div class="bed-meta">
        <span>${bed.id}</span>
        <strong>${bed.level}</strong>
        <small>P ${bed.pressureStatus} · IV ${bed.ivStatus}</small>
        <b>${bed.priorityScore}</b>
      </div>
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

function renderHardwareStatus() {
  elements.hardwareModeLabel.className = `mode-pill ${
    hardwareMode ? (hardwareStatus.connected ? "live" : "offline") : "simulated"
  }`;
  elements.hardwareModeLabel.textContent = hardwareMode
    ? hardwareStatus.connected
      ? "Hardware Live"
      : "Hardware Offline"
    : "Simulated Mode";
  elements.toggleHardware.textContent = hardwareMode ? "Use Simulation" : "Use Hardware";
  elements.hardwareStatusCopy.textContent = hardwareStatus.message;
  elements.lastUpdateCopy.textContent = hardwareStatus.lastUpdatedAt
    ? `Last packet ${new Intl.DateTimeFormat("en-MY", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Kuala_Lumpur",
      }).format(hardwareStatus.lastUpdatedAt)}`
    : "No hardware packet received";
  elements.hardwarePacket.textContent = JSON.stringify(latestHardwarePacket, null, 2);
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
    aiExplanation: buildAiExplanation(pressure, iv, priorityScore),
    nurseTasks: buildNurseTasks(pressure, iv),
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
  const criticalBed = priorityQueue[0] || enrichedBeds[0];

  return {
    beds: enrichedBeds,
    priorityQueue,
    criticalBed,
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
    visualization: buildVisualizationState(enrichedBeds, criticalBed.id),
  };
}

function acknowledgeAlert(sourceBeds, bedId) {
  return sourceBeds.map((bed) => (bed.id === bedId ? { ...bed, acknowledged: true } : bed));
}

function normalizeHardwareReading(reading) {
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

function applyHardwareReading(sourceBeds, reading) {
  const normalized = normalizeHardwareReading(reading);
  if (!normalized) return sourceBeds;

  return sourceBeds.map((bed) =>
    bed.id === normalized.bedId
      ? { ...bed, pressure: normalized.pressure, iv: normalized.iv, acknowledged: false }
      : bed,
  );
}

function buildDemoScenarioBeds(sourceBeds, scenario) {
  return sourceBeds.map((sourceBed, index) => {
    const bed = {
      ...sourceBed,
      pressure: { zones: [18, 24, 30, 26], highDurationSec: 0, lastMovementMin: 8 },
      iv: { remainingMl: 220, flowMlPerMin: 6, abnormalFlow: false },
      acknowledged: false,
    };

    if (scenario === "pressure-ulcer" && index === 0) {
      return {
        ...bed,
        pressure: { zones: [18, 42, 88, 92], highDurationSec: 76, lastMovementMin: 38 },
        iv: { remainingMl: 190, flowMlPerMin: 6, abnormalFlow: false },
        acknowledged: false,
      };
    }

    if (scenario === "iv-abnormal" && index === 2) {
      return {
        ...bed,
        pressure: { zones: [30, 36, 41, 38], highDurationSec: 0, lastMovementMin: 12 },
        iv: { remainingMl: 36, flowMlPerMin: 0, abnormalFlow: true },
        acknowledged: false,
      };
    }

    if (scenario === "multi-bed-rush") {
      const rushCases = [
        {
          pressure: { zones: [20, 44, 86, 91], highDurationSec: 82, lastMovementMin: 40 },
          iv: { remainingMl: 180, flowMlPerMin: 6, abnormalFlow: false },
        },
        {
          pressure: { zones: [24, 36, 42, 39], highDurationSec: 0, lastMovementMin: 18 },
          iv: { remainingMl: 32, flowMlPerMin: 0, abnormalFlow: true },
        },
        {
          pressure: { zones: [48, 64, 78, 72], highDurationSec: 58, lastMovementMin: 32 },
          iv: { remainingMl: 34, flowMlPerMin: 4, abnormalFlow: false },
        },
      ];
      const rushCase = rushCases[index];
      if (rushCase) return { ...bed, ...rushCase, acknowledged: false };
    }

    return bed;
  });
}

function buildVisualizationState(enrichedBeds, selectedBedId) {
  const selectedBed = enrichedBeds.find((bed) => bed.id === selectedBedId) || enrichedBeds[0];
  const wardSlots = [
    { x: 18, y: 24 },
    { x: 58, y: 18 },
    { x: 18, y: 62 },
    { x: 58, y: 58 },
  ];
  const nurseStation = { label: "Nurse Station", x: 8, y: 8 };

  return {
    wardType: "2.5D Digital Twin",
    pressureZones: selectedBed.pressure.zones.map((value, index) => ({
      label: ["Head", "Back", "Hip", "Leg"][index],
      value,
      level: value >= 70 ? "High" : value >= 40 ? "Medium" : "Low",
    })),
    ivBag: {
      fillPercent: round(clamp((selectedBed.iv.remainingMl / 500) * 100)),
      remainingMl: selectedBed.iv.remainingMl,
      status: selectedBed.iv.abnormalFlow
        ? "Abnormal"
        : selectedBed.iv.remainingMl <= 50
          ? "Low"
          : "Normal",
    },
    wardBeds: enrichedBeds.map((bed, index) => ({
      id: bed.id,
      level: bed.level,
      priorityScore: bed.priorityScore,
      pressureStatus: bed.pressure.level,
      ivStatus: bed.iv.level,
      selected: bed.id === selectedBedId,
      twinVariant: bed.id === selectedBedId ? "priority" : bed.level.toLowerCase(),
      x: wardSlots[index % wardSlots.length].x,
      y: wardSlots[index % wardSlots.length].y,
    })),
    nurseRoute: {
      targetBedId: selectedBed.id,
      from: nurseStation,
      to: wardSlots[enrichedBeds.findIndex((bed) => bed.id === selectedBed.id)] || wardSlots[0],
    },
    triagePipeline: [
      {
        label: "Pressure",
        value: `${selectedBed.pressure.score}/100`,
        status: selectedBed.pressure.level,
      },
      {
        label: "IV",
        value: `${selectedBed.iv.score}/100`,
        status: selectedBed.iv.level,
      },
      {
        label: "AI Triage",
        value: `${selectedBed.priorityScore}/100`,
        status: "Prioritizing",
      },
      {
        label: "Nurse Task",
        value: selectedBed.id,
        status: selectedBed.recommendedAction,
      },
    ],
  };
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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

function buildAiExplanation(pressure, iv, priorityScore) {
  return [
    {
      label: "Pressure risk",
      value: `${pressure.score}/100`,
      detail: `${pressure.level} pressure in zone ${pressure.highestZone + 1}`,
    },
    {
      label: "IV risk",
      value: `${iv.score}/100`,
      detail: iv.abnormalFlow
        ? "abnormal flow pattern"
        : iv.timeRemainingMin === null
          ? "flow paused"
          : `${iv.timeRemainingMin} min remaining`,
    },
    {
      label: "Movement gap",
      value: `${pressure.zones.length} zones`,
      detail: `highest pressure ${pressure.maxPressure}, average ${pressure.averagePressure}`,
    },
    {
      label: "AI priority",
      value: `${priorityScore}/100`,
      detail:
        pressure.level === "High"
          ? "sustained high pressure drives the first check"
          : iv.level === "Urgent"
            ? "IV abnormality drives the first check"
            : "combined bedside signals determine queue order",
    },
  ];
}

function buildNurseTasks(pressure, iv) {
  const tasks = [];

  if (pressure.level === "High") {
    tasks.push({
      label: "Reposition patient",
      detail: `Relieve pressure around zone ${pressure.highestZone + 1}`,
    });
    tasks.push({
      label: "Inspect skin condition",
      detail: "Check redness or discomfort before logging response",
    });
  } else if (pressure.level === "Medium") {
    tasks.push({
      label: "Check posture",
      detail: `Review pressure trend around zone ${pressure.highestZone + 1}`,
    });
  }

  if (iv.level === "Urgent") {
    tasks.push({
      label: "Inspect IV bag and line",
      detail: iv.abnormalFlow ? "Flow pattern looks abnormal" : `${iv.remainingMl} ml remaining`,
    });
  } else if (iv.level === "Monitor") {
    tasks.push({
      label: "Prepare IV replacement",
      detail: `${iv.timeRemainingMin} min estimated remaining`,
    });
  }

  tasks.push({
    label: "Acknowledge alert",
    detail: "Confirm nurse has seen the bedside risk",
  });

  return tasks.slice(0, 4);
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

document.querySelectorAll("[data-scenario]").forEach((button) => {
  button.addEventListener("click", () => {
    hardwareMode = false;
    hardwareStatus = {
      connected: false,
      message: `Demo scenario loaded: ${button.textContent}`,
      lastUpdatedAt: null,
    };
    latestHardwarePacket = { mode: "scenario", scenario: button.dataset.scenario };
    beds = buildDemoScenarioBeds(initialBeds, button.dataset.scenario);
    selectedBedId = buildDashboardState(beds).criticalBed.id;
    render();
  });
});

elements.toggleHardware.addEventListener("click", () => {
  hardwareMode = !hardwareMode;
  hardwareStatus = hardwareMode
    ? {
        connected: false,
        message: "Looking for bridge at localhost:3001/latest",
        lastUpdatedAt: null,
      }
    : {
        connected: false,
        message: "Waiting in simulated mode",
        lastUpdatedAt: null,
      };
  latestHardwarePacket = hardwareMode ? { mode: "hardware", endpoint: "/latest" } : { mode: "simulated" };
  render();
  if (hardwareMode) pollHardwareBridge();
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
  hardwareMode = false;
  hardwareStatus = {
    connected: false,
    message: "Waiting in simulated mode",
    lastUpdatedAt: null,
  };
  latestHardwarePacket = { mode: "simulated" };
  render();
});

async function pollHardwareBridge() {
  if (!hardwareMode) return;

  try {
    const response = await fetch("http://localhost:3001/latest", { cache: "no-store" });
    if (!response.ok) throw new Error(`Bridge returned ${response.status}`);
    const payload = await response.json();
    const reading = payload.reading || payload;
    const normalized = normalizeHardwareReading(reading);
    if (!normalized) throw new Error("Bridge packet did not match CareHub protocol");

    beds = applyHardwareReading(beds, normalized);
    selectedBedId = normalized.bedId;
    latestHardwarePacket = payload;
    hardwareStatus = {
      connected: payload.connected !== false,
      message: `${normalized.bedId}: pressure zones ${normalized.pressure.zones.join(", ")}; IV ${normalized.iv.remainingMl} ml`,
      lastUpdatedAt: new Date(payload.receivedAt || Date.now()),
    };
  } catch (error) {
    hardwareStatus = {
      connected: false,
      message: error.message || "Hardware bridge unavailable",
      lastUpdatedAt: hardwareStatus.lastUpdatedAt,
    };
  }

  render();
}

setInterval(() => {
  if (hardwareMode) pollHardwareBridge();
}, 1000);

render();
