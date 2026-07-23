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
let selectedBedId = "Bed 01";

const elements = {
  shiftTime: document.querySelector("#shift-time"),
  totalCount: document.querySelector("#total-count"),
  urgentCount: document.querySelector("#urgent-count"),
  monitorCount: document.querySelector("#monitor-count"),
  stableCount: document.querySelector("#stable-count"),
  ivWatchCount: document.querySelector("#iv-watch-count"),
  avgPriority: document.querySelector("#avg-priority"),
  priorityList: document.querySelector("#priority-list"),
  bedGrid: document.querySelector("#bed-grid"),
  eventLog: document.querySelector("#event-log"),
  selectedTitle: document.querySelector("#selected-title"),
  selectedStatus: document.querySelector("#selected-status"),
  pressureMap: document.querySelector("#pressure-map"),
  liveScore: document.querySelector("#live-score"),
  liveIv: document.querySelector("#live-iv"),
  liveAge: document.querySelector("#live-age"),
  liveAction: document.querySelector("#live-action"),
  liveExplanation: document.querySelector("#live-explanation"),
  simulatePressure: document.querySelector("#simulate-pressure"),
  simulateIv: document.querySelector("#simulate-iv"),
  simulateReset: document.querySelector("#simulate-reset"),
};

function render() {
  const state = buildDashboardState(beds);
  const selectedBed =
    state.beds.find((bed) => bed.id === selectedBedId) || state.beds.find((bed) => bed.id);

  renderClock();
  renderSummary(state.summary);
  renderPriorityQueue(state.priorityQueue);
  renderSelectedBed(selectedBed);
  renderBeds(state.beds);
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

function renderPriorityQueue(queue) {
  elements.priorityList.replaceChildren();

  if (queue.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No active priority alerts. Ward signals are stable.";
    elements.priorityList.append(empty);
    return;
  }

  queue.forEach((bed, index) => {
    const card = document.createElement("article");
    card.className = `priority-card ${bed.level.toLowerCase()}`;
    card.innerHTML = `
      <div class="priority-rank">Priority ${index + 1} · ${bed.alertAgeLabel}</div>
      <strong>${bed.id} - ${bed.level}</strong>
      <p>${bed.explanation}</p>
      <p><b>Action:</b> ${bed.recommendedAction}</p>
      <button type="button" data-select="${bed.id}">View Bed</button>
      <button type="button" data-ack="${bed.id}">Acknowledge</button>
    `;
    elements.priorityList.append(card);
  });
}

function renderSelectedBed(bed) {
  elements.selectedTitle.textContent = `${bed.id} · ${bed.patient}`;
  elements.selectedStatus.className = `pill ${bed.level.toLowerCase()}`;
  elements.selectedStatus.textContent = bed.level;
  elements.liveScore.textContent = `${bed.priorityScore} / 100`;
  elements.liveIv.textContent =
    bed.iv.timeRemainingMin === null ? "Flow paused" : `${bed.iv.timeRemainingMin} min`;
  elements.liveAge.textContent = bed.alertAgeLabel;
  elements.liveAction.textContent = bed.recommendedAction;
  elements.liveExplanation.textContent = bed.explanation;
  renderPressureMap(bed);
}

function renderPressureMap(bed) {
  elements.pressureMap.replaceChildren();

  bed.pressure.zones.forEach((value, index) => {
    const zone = document.createElement("div");
    zone.className = `pressure-zone ${getZoneClass(value)}`;
    zone.innerHTML = `
      <span>Zone ${index + 1}</span>
      <strong>${value}</strong>
    `;
    elements.pressureMap.append(zone);
  });
}

function renderBeds(enrichedBeds) {
  elements.bedGrid.replaceChildren();

  enrichedBeds.forEach((bed) => {
    const card = document.createElement("article");
    card.className = `bed-card ${bed.id === selectedBedId ? "selected" : ""}`;
    card.dataset.select = bed.id;
    card.innerHTML = `
      <header>
        <div>
          <h3>${bed.id}</h3>
          <div class="patient-name">${bed.patient}</div>
        </div>
        <span class="pill ${bed.level.toLowerCase()}">${bed.level}</span>
      </header>
      <p>${bed.explanation}</p>
      <div class="bed-metrics">
        <div><span>Pressure</span><strong>${bed.pressure.level}</strong></div>
        <div><span>IV</span><strong>${bed.iv.level}</strong></div>
        <div><span>Alert Age</span><strong>${bed.alertAgeLabel}</strong></div>
        <div><span>Priority</span><strong>${bed.priorityScore}/100</strong></div>
      </div>
    `;
    elements.bedGrid.append(card);
  });
}

function renderEventLog(events) {
  elements.eventLog.replaceChildren();

  if (events.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No unresolved bedside risk events.";
    elements.eventLog.append(empty);
    return;
  }

  events.forEach((event, index) => {
    const item = document.createElement("article");
    item.className = `event-item ${event.level.toLowerCase()}`;
    item.innerHTML = `
      <strong>${String(index + 1).padStart(2, "0")} · ${event.level}</strong>
      <p>${event.message}</p>
      <p><b>Next:</b> ${event.action}</p>
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

function getZoneClass(value) {
  if (value >= 70) return "zone-high";
  if (value >= 40) return "zone-medium";
  return "zone-low";
}

function selectBed(bedId) {
  selectedBedId = bedId;
  render();
}

elements.priorityList.addEventListener("click", (event) => {
  const selectButton = event.target.closest("[data-select]");
  const ackButton = event.target.closest("[data-ack]");

  if (selectButton) {
    selectBed(selectButton.dataset.select);
    return;
  }

  if (ackButton) {
    beds = acknowledgeAlert(beds, ackButton.dataset.ack);
    selectedBedId = ackButton.dataset.ack;
    render();
  }
});

elements.bedGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-select]");
  if (!card) return;
  selectBed(card.dataset.select);
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

elements.simulateReset.addEventListener("click", () => {
  beds = structuredClone(initialBeds);
  selectedBedId = "Bed 01";
  render();
});

render();
