import {
  acknowledgeBed,
  applyBedsidePacket,
  buildAttentionDashboardState,
} from "./carehub-attention-core.js";

const initialBeds = [
  {
    id: "Bed 01",
    patient: "Aisyah Rahman",
    pressure: { zones: [18, 26, 34, 29], highDurationSec: 0, lastMovementMin: 6 },
    iv: { remainingMl: 210, flowMlPerMin: 6, abnormalFlow: false },
    patientContext: {
      bradenScore: 18,
      pressureRiskBand: "lower",
      mobility: "independent",
      canSelfReposition: true,
      fixedPosition: false,
      infusionContext: "routine hydration",
    },
    wetnessDetected: false,
    callActive: false,
    acknowledged: false,
  },
  {
    id: "Bed 02",
    patient: "Tan Mei Ling",
    pressure: { zones: [24, 36, 82, 88], highDurationSec: 5700, lastMovementMin: 96 },
    iv: { remainingMl: 190, flowMlPerMin: 5, abnormalFlow: false },
    patientContext: {
      bradenScore: 11,
      pressureRiskBand: "high",
      mobility: "very limited",
      canSelfReposition: false,
      fixedPosition: false,
      infusionContext: "routine hydration",
    },
    wetnessDetected: false,
    callActive: false,
    acknowledged: false,
  },
  {
    id: "Bed 03",
    patient: "Kumar Velu",
    pressure: { zones: [32, 42, 51, 47], highDurationSec: 1200, lastMovementMin: 14 },
    iv: { remainingMl: 58, flowMlPerMin: 7, abnormalFlow: false },
    patientContext: {
      bradenScore: 15,
      pressureRiskBand: "moderate",
      mobility: "assisted",
      canSelfReposition: true,
      fixedPosition: false,
      infusionContext: "routine hydration",
    },
    wetnessDetected: false,
    callActive: false,
    acknowledged: false,
  },
  {
    id: "Bed 04",
    patient: "Nur Iman",
    pressure: { zones: [22, 28, 31, 27], highDurationSec: 0, lastMovementMin: 9 },
    iv: { remainingMl: 130, flowMlPerMin: 0, abnormalFlow: true },
    patientContext: {
      bradenScore: 17,
      pressureRiskBand: "lower",
      mobility: "independent",
      canSelfReposition: true,
      fixedPosition: false,
      infusionContext: null,
    },
    wetnessDetected: false,
    callActive: false,
    acknowledged: false,
  },
];

let beds = structuredClone(initialBeds);
let selectedBedId = "Bed 02";
let hardwareMode = false;
let hardwareTimer = null;
let latestHardwarePacket = { mode: "simulated" };
let hardwareStatus = {
  connected: false,
  message: "Waiting in simulated mode",
  lastUpdatedAt: null,
};

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

const levelClass = (level) => {
  if (level === "Immediate review" || level === "High attention") return "urgent";
  if (level === "Review" || level === "Watch") return "monitor";
  if (level === "Acknowledged") return "acknowledged";
  return "stable";
};

function render() {
  const state = buildAttentionDashboardState(beds);
  const selectedBed = state.beds.find((bed) => bed.id === selectedBedId);
  const focusBed = selectedBed || state.focusBed;
  selectedBedId = focusBed.id;

  renderClock();
  renderSummary(state.summary);
  renderPrimaryAttention(focusBed);
  renderPressureMap(focusBed.pressure);
  renderIv(focusBed.iv);
  renderTasks(focusBed);
  renderExplanation(focusBed);
  renderQueue(state.attentionQueue, focusBed.id);
  renderBedMap(state.beds, focusBed.id);
  renderPrototypeFlow();
  renderEventLog(state.attentionQueue);
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
  elements.urgentCount.textContent = summary.immediate + summary.high;
  elements.monitorCount.textContent = summary.review + summary.watch;
  elements.stableCount.textContent = summary.stable;
  elements.ivWatchCount.textContent = summary.ivWatch;
  elements.avgPriority.textContent = summary.activeNeeds;
}

function renderPrimaryAttention(bed) {
  elements.decisionHeadline.textContent =
    bed.level === "Stable" ? "No monitored need requires extra attention" : `Review ${bed.id}`;
  elements.criticalTitle.textContent = `${bed.id} · ${bed.patient}`;
  elements.criticalStatus.className = `status-pill ${levelClass(bed.level)}`;
  elements.criticalStatus.textContent = bed.level;
  elements.criticalAction.textContent = bed.recommendedAction;
  elements.criticalReason.textContent = bed.explanation;
  elements.liveScore.textContent = bed.confidence;
  elements.liveIv.textContent =
    bed.iv.timeRemainingMin === null ? "Flow requires review" : `${bed.iv.timeRemainingMin} min`;
  elements.liveAge.textContent = `${bed.pressure.exposureMin} min exposure`;
}

function renderPressureMap(pressure) {
  const labels = ["Head", "Back", "Hip", "Leg"];
  elements.pressureMap.replaceChildren();
  pressure.zones.forEach((value, index) => {
    const zoneElement = document.createElement("div");
    const zoneLevel = value >= 70 ? "high" : value >= 45 ? "medium" : "low";
    zoneElement.className = `pressure-zone ${zoneLevel}`;
    zoneElement.innerHTML = `<span>${labels[index]}</span><strong>${value}</strong><small>${zoneLevel}</small>`;
    elements.pressureMap.append(zoneElement);
  });
}

function renderIv(iv) {
  const fillPercent = Math.min(100, Math.max(0, Math.round((iv.remainingMl / 500) * 100)));
  const status = iv.abnormalFlow ? "abnormal" : iv.timeRemainingMin !== null && iv.timeRemainingMin <= 10 ? "low" : "normal";
  elements.ivFill.style.height = `${fillPercent}%`;
  elements.ivFill.className = `iv-fill ${status}`;
  elements.ivStatusLabel.textContent = `${iv.abnormalFlow ? "Review" : "Monitoring"} · ${iv.remainingMl} ml`;
}

function renderTasks(bed) {
  const tasks = [];
  tasks.push({ label: "Review monitored need", detail: bed.recommendedAction });
  if (bed.missingContext.length > 0) {
    tasks.push({
      label: "Check missing context",
      detail: bed.missingContext.join(", "),
    });
  }
  tasks.push({ label: "Use clinical judgement", detail: "CareHub supports attention management; it does not replace clinical prioritisation." });
  tasks.push({ label: "Acknowledge alert", detail: "Confirm that the monitored need has been seen." });

  elements.nurseTasks.replaceChildren();
  tasks.slice(0, 4).forEach((task, index) => {
    const item = document.createElement("article");
    item.innerHTML = `
      <span>${index + 1}</span>
      <div><strong>${task.label}</strong><small>${task.detail}</small></div>
    `;
    elements.nurseTasks.append(item);
  });
}

function renderExplanation(bed) {
  elements.rawSignalCopy.textContent = `Pressure ${bed.pressure.level} · IV ${bed.iv.level}`;
  elements.riskPatternCopy.textContent = `${bed.level} · ${bed.confidence}`;
  elements.responseCopy.textContent = bed.recommendedAction;
  elements.aiBreakdown.replaceChildren();

  const rows = [
    {
      label: "Pressure pattern",
      value: `${bed.pressure.exposureMin} min`,
      status: `${bed.pressure.highestZoneLabel} · max ${bed.pressure.maxPressure}`,
    },
    {
      label: "Movement gap",
      value: `${bed.pressure.movementGapMin} min`,
      status: bed.patientContext?.mobility || "context unavailable",
    },
    {
      label: "Attention support",
      value: bed.level,
      status: "Not a clinical triage decision",
    },
    {
      label: "Context check",
      value: bed.missingContext.length ? "Limited" : "Available",
      status: bed.missingContext.length ? bed.missingContext.join(", ") : "No required prototype context missing",
    },
  ];

  rows.forEach((row, index) => {
    const item = document.createElement("article");
    item.className = index === 2 ? "active" : "";
    item.innerHTML = `<span>${row.label}</span><strong>${row.value}</strong><small>${row.status}</small>`;
    elements.aiBreakdown.append(item);
  });
}

function renderQueue(queue, focusBedId) {
  elements.priorityList.replaceChildren();
  const otherBeds = queue.filter((bed) => bed.id !== focusBedId);

  if (otherBeds.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No other monitored needs require review.";
    elements.priorityList.append(empty);
    return;
  }

  otherBeds.forEach((bed) => {
    const item = document.createElement("button");
    item.type = "button";
    item.dataset.select = bed.id;
    item.className = `queue-item dispatch-ticket ${levelClass(bed.level)}`;
    item.innerHTML = `
      <span>${bed.id} · ${bed.level}</span>
      <strong>${bed.recommendedAction}</strong>
      <small>${bed.explanation}</small>
    `;
    item.addEventListener("click", () => {
      selectedBedId = bed.id;
      render();
    });
    elements.priorityList.append(item);
  });
}

function renderBedMap(allBeds, focusBedId) {
  const wardSlots = [
    { x: 18, y: 24 },
    { x: 58, y: 18 },
    { x: 18, y: 62 },
    { x: 58, y: 58 },
  ];

  elements.bedMap.replaceChildren();
  const station = document.createElement("div");
  station.className = "nurse-station";
  station.style.left = "8%";
  station.style.top = "8%";
  station.textContent = "Nurse Station";
  elements.bedMap.append(station);

  allBeds.forEach((bed, index) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.dataset.select = bed.id;
    const cssLevel = levelClass(bed.level);
    tile.className = `bed-tile twin-bed ${cssLevel} ${bed.id === focusBedId ? "selected" : ""}`;
    tile.style.left = `${wardSlots[index % wardSlots.length].x}%`;
    tile.style.top = `${wardSlots[index % wardSlots.length].y}%`;
    tile.innerHTML = `
      <div class="bed-object" aria-hidden="true">
        <div class="iv-mini-pole"><i></i></div>
        <div class="bed-frame">
          <span class="bed-pillow"></span>
          <span class="bed-mattress"></span>
          <span class="bed-pressure-strip ${bed.pressure.level === "High attention" ? "high" : "medium"}"></span>
        </div>
      </div>
      <div class="bed-meta">
        <span>${bed.id}</span>
        <strong>${bed.level}</strong>
        <small>${bed.activeSignalCount} monitored need${bed.activeSignalCount === 1 ? "" : "s"}</small>
        <b>${bed.missingContext.length ? "context?" : "context✓"}</b>
      </div>
    `;
    tile.addEventListener("click", () => {
      selectedBedId = bed.id;
      render();
    });
    elements.bedMap.append(tile);
  });
}

function renderPrototypeFlow() {
  const flow = [
    ["Bedside sensors", "Pressure, IV, wetness and call signals"],
    ["Signal interpretation", "Turn raw readings into monitored bedside states"],
    ["Patient context", "Use clinician-entered mobility and pressure-risk context"],
    ["Attention support", "Surface explainable needs for nurse review"],
  ];

  elements.prototypeFlow.replaceChildren();
  flow.forEach(([label, detail], index) => {
    const node = document.createElement("article");
    node.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong>${label}</strong><small>${detail}</small>`;
    elements.prototypeFlow.append(node);
  });
}

function renderEventLog(events) {
  elements.eventLog.replaceChildren();
  events.forEach((bed) => {
    const item = document.createElement("article");
    item.className = `event-item ${levelClass(bed.level)}`;
    item.innerHTML = `
      <strong>${bed.id} · ${bed.level}</strong>
      <p>${bed.explanation}</p>
      <small>${bed.recommendedAction}</small>
    `;
    elements.eventLog.append(item);
  });
}

function renderHardwareStatus() {
  elements.hardwareModeLabel.className = `mode-pill ${hardwareMode ? (hardwareStatus.connected ? "live" : "offline") : "simulated"}`;
  elements.hardwareModeLabel.textContent = hardwareMode
    ? hardwareStatus.connected
      ? "Hardware Live"
      : "Hardware Offline"
    : "Simulated Mode";
  elements.toggleHardware.textContent = hardwareMode ? "Use Simulation" : "Use Hardware";
  elements.hardwareStatusCopy.textContent = hardwareStatus.message;
  elements.lastUpdateCopy.textContent = hardwareStatus.lastUpdatedAt
    ? `Last packet ${hardwareStatus.lastUpdatedAt.toLocaleTimeString("en-MY", { hour12: false })}`
    : "No hardware packet received";
  elements.hardwarePacket.textContent = JSON.stringify(latestHardwarePacket, null, 2);
}

function applyScenario(name) {
  beds = structuredClone(initialBeds);

  if (name === "pressure-ulcer") {
    beds[0].pressure = { zones: [22, 48, 86, 92], highDurationSec: 6600, lastMovementMin: 115 };
    beds[0].patientContext = {
      ...beds[0].patientContext,
      bradenScore: 10,
      pressureRiskBand: "high",
      mobility: "very limited",
      canSelfReposition: false,
    };
  }

  if (name === "iv-abnormal") {
    beds[2].iv = { remainingMl: 36, flowMlPerMin: 0, abnormalFlow: true };
    beds[2].patientContext.infusionContext = null;
  }

  if (name === "multi-bed-rush") {
    beds[0].pressure = { zones: [20, 44, 86, 91], highDurationSec: 6000, lastMovementMin: 105 };
    beds[0].patientContext = {
      ...beds[0].patientContext,
      pressureRiskBand: "high",
      mobility: "very limited",
      canSelfReposition: false,
    };
    beds[1].wetnessDetected = true;
    beds[2].iv = { remainingMl: 34, flowMlPerMin: 4, abnormalFlow: false };
    beds[3].callActive = true;
  }

  selectedBedId = beds[0].id;
  render();
}

async function pollHardware() {
  try {
    const response = await fetch("http://localhost:3001/latest", { cache: "no-store" });
    if (!response.ok) throw new Error(`Bridge returned ${response.status}`);
    const packet = await response.json();
    latestHardwarePacket = packet;
    beds = applyBedsidePacket(beds, packet);
    hardwareStatus = {
      connected: true,
      message: "Bedside bridge connected",
      lastUpdatedAt: new Date(),
    };
  } catch (error) {
    hardwareStatus = {
      connected: false,
      message: `Bridge unavailable: ${error.message}`,
      lastUpdatedAt: hardwareStatus.lastUpdatedAt,
    };
  }
  render();
}

function setHardwareMode(enabled) {
  hardwareMode = enabled;
  if (hardwareTimer) clearInterval(hardwareTimer);
  hardwareTimer = null;

  if (enabled) {
    pollHardware();
    hardwareTimer = setInterval(pollHardware, 1500);
  } else {
    hardwareStatus = {
      connected: false,
      message: "Waiting in simulated mode",
      lastUpdatedAt: null,
    };
    latestHardwarePacket = { mode: "simulated" };
    render();
  }
}

document.querySelectorAll("[data-scenario]").forEach((button) => {
  button.addEventListener("click", () => applyScenario(button.dataset.scenario));
});

elements.toggleHardware.addEventListener("click", () => setHardwareMode(!hardwareMode));

elements.simulatePressure.addEventListener("click", () => {
  beds = beds.map((bed, index) =>
    index === 0
      ? {
          ...bed,
          pressure: { zones: [20, 45, 88, 94], highDurationSec: 6900, lastMovementMin: 118 },
          patientContext: {
            ...bed.patientContext,
            pressureRiskBand: "high",
            mobility: "very limited",
            canSelfReposition: false,
          },
          acknowledged: false,
        }
      : bed,
  );
  selectedBedId = beds[0].id;
  render();
});

elements.simulateIv.addEventListener("click", () => {
  beds = beds.map((bed, index) =>
    index === 2
      ? {
          ...bed,
          iv: { remainingMl: 38, flowMlPerMin: 0, abnormalFlow: true },
          patientContext: { ...bed.patientContext, infusionContext: null },
          acknowledged: false,
        }
      : bed,
  );
  selectedBedId = beds[2].id;
  render();
});

elements.acknowledgeSelected.addEventListener("click", () => {
  beds = acknowledgeBed(beds, selectedBedId);
  render();
});

elements.simulateReset.addEventListener("click", () => {
  beds = structuredClone(initialBeds);
  selectedBedId = "Bed 02";
  render();
});

render();