import assert from "node:assert/strict";
import {
  applyHardwareReading,
  buildDashboardState,
  buildDemoScenarioBeds,
  calculateBedRisk,
  acknowledgeAlert,
  normalizeHardwareReading,
} from "../carehub-core.js";

const beds = [
  {
    id: "Bed 01",
    patient: "Aisyah Rahman",
    pressure: {
      zones: [22, 31, 78, 88],
      highDurationSec: 72,
      lastMovementMin: 34,
    },
    iv: {
      remainingMl: 48,
      flowMlPerMin: 6,
      abnormalFlow: false,
    },
    acknowledged: false,
  },
  {
    id: "Bed 02",
    patient: "Tan Mei Ling",
    pressure: {
      zones: [18, 24, 28, 32],
      highDurationSec: 0,
      lastMovementMin: 8,
    },
    iv: {
      remainingMl: 260,
      flowMlPerMin: 5,
      abnormalFlow: false,
    },
    acknowledged: false,
  },
  {
    id: "Bed 03",
    patient: "Kumar Velu",
    pressure: {
      zones: [42, 57, 62, 51],
      highDurationSec: 18,
      lastMovementMin: 16,
    },
    iv: {
      remainingMl: 70,
      flowMlPerMin: 0,
      abnormalFlow: true,
    },
    acknowledged: false,
  },
];

const urgent = calculateBedRisk(beds[0]);
assert.equal(urgent.level, "Urgent");
assert.equal(urgent.pressure.level, "High");
assert.deepEqual(urgent.pressure.zones, [22, 31, 78, 88]);
assert.match(urgent.explanation, /pressure/i);
assert.match(urgent.recommendedAction, /Reposition/i);

const stable = calculateBedRisk(beds[1]);
assert.equal(stable.level, "Stable");
assert.equal(stable.priorityScore < 40, true);

const dashboard = buildDashboardState(beds);
assert.equal(dashboard.priorityQueue[0].id, "Bed 01");
assert.equal(dashboard.priorityQueue[1].id, "Bed 03");
assert.equal(dashboard.summary.urgent, 2);
assert.equal(dashboard.summary.stable, 1);

const mixedSeverity = buildDashboardState([
  {
    id: "Bed A",
    patient: "Monitor Case",
    pressure: { zones: [42, 57, 62, 51], highDurationSec: 18, lastMovementMin: 16 },
    iv: { remainingMl: 70, flowMlPerMin: 7, abnormalFlow: false },
    acknowledged: false,
  },
  {
    id: "Bed B",
    patient: "Urgent Case",
    pressure: { zones: [24, 36, 82, 88], highDurationSec: 84, lastMovementMin: 42 },
    iv: { remainingMl: 190, flowMlPerMin: 5, abnormalFlow: false },
    acknowledged: false,
  },
]);
assert.equal(mixedSeverity.priorityQueue[0].id, "Bed B");

const acknowledged = acknowledgeAlert(beds, "Bed 01");
const acknowledgedDashboard = buildDashboardState(acknowledged);
const bed01 = acknowledgedDashboard.beds.find((bed) => bed.id === "Bed 01");
assert.equal(bed01.acknowledged, true);
assert.equal(bed01.level, "Acknowledged");
assert.equal(acknowledgedDashboard.priorityQueue[0].id, "Bed 03");

assert.equal(dashboard.summary.totalBeds, 3);
assert.equal(dashboard.summary.ivEndingSoon, 2);
assert.equal(dashboard.summary.avgPriorityScore > 40, true);
assert.equal(dashboard.eventLog.length, 2);
assert.match(dashboard.eventLog[0].message, /Bed 01/);
assert.equal(dashboard.beds[0].alertAgeLabel, "72 sec");
assert.equal(dashboard.beds[1].alertAgeLabel, "No active alert");
assert.equal(dashboard.criticalBed.id, "Bed 01");
assert.match(dashboard.nextAction.title, /Bed 01/);
assert.match(dashboard.nextAction.reason, /pressure/i);
assert.equal(dashboard.sensorPipeline.length, 4);
assert.equal(dashboard.sensorPipeline[0].label, "Pressure Mat");
assert.equal(dashboard.nurseDecision.primaryBedId, "Bed 01");
assert.equal(dashboard.nurseDecision.queue.length, 1);
assert.match(dashboard.nurseDecision.headline, /Check Bed 01 first/);
assert.match(dashboard.nurseDecision.why, /pressure/i);
assert.equal(dashboard.prototypeFlow.at(-1).label, "Nurse action");
assert.equal(dashboard.criticalBed.aiExplanation.length, 4);
assert.equal(dashboard.criticalBed.aiExplanation[0].label, "Pressure risk");
assert.match(dashboard.criticalBed.aiExplanation.at(-1).detail, /sustained high pressure/i);
assert.equal(dashboard.criticalBed.nurseTasks.length, 4);
assert.match(dashboard.criticalBed.nurseTasks[0].label, /Reposition/i);
assert.match(dashboard.criticalBed.nurseTasks.at(-1).label, /Acknowledge/i);

const rawHardwareReading = {
  bedId: "Prototype Bed",
  pressure: {
    zones: [-12.4, 44.5, 109, "bad"],
    highDurationSec: -9,
    lastMovementMin: "18.6",
  },
  iv: {
    remainingMl: "42.7",
    flowMlPerMin: -3,
    abnormalFlow: "yes",
  },
};
const normalizedHardwareReading = normalizeHardwareReading(rawHardwareReading);
assert.deepEqual(normalizedHardwareReading, {
  bedId: "Prototype Bed",
  pressure: {
    zones: [0, 45, 100, 0],
    highDurationSec: 0,
    lastMovementMin: 19,
  },
  iv: {
    remainingMl: 43,
    flowMlPerMin: 0,
    abnormalFlow: true,
  },
});
assert.equal(normalizeHardwareReading({ pressure: { zones: [1, 2] } }), null);

const hardwareUpdatedBeds = applyHardwareReading(
  [{ ...beds[0], acknowledged: true }, beds[1]],
  {
    bedId: "Bed 01",
    pressure: { zones: [10, 20, 80, 90], highDurationSec: 61, lastMovementMin: 28 },
    iv: { remainingMl: 34, flowMlPerMin: 5, abnormalFlow: false },
  },
);
assert.deepEqual(hardwareUpdatedBeds[0].pressure.zones, [10, 20, 80, 90]);
assert.equal(hardwareUpdatedBeds[0].iv.remainingMl, 34);
assert.equal(hardwareUpdatedBeds[0].acknowledged, false);
assert.deepEqual(hardwareUpdatedBeds[1], beds[1]);

const pressureScenario = buildDemoScenarioBeds(beds, "pressure-ulcer");
assert.deepEqual(pressureScenario[0].pressure.zones, [18, 42, 88, 92]);
assert.equal(pressureScenario[0].iv.abnormalFlow, false);
assert.equal(buildDashboardState(pressureScenario).criticalBed.id, "Bed 01");

const ivScenario = buildDemoScenarioBeds(beds, "iv-abnormal");
assert.equal(ivScenario[2].iv.remainingMl, 36);
assert.equal(ivScenario[2].iv.abnormalFlow, true);
const ivScenarioDashboard = buildDashboardState(ivScenario);
assert.equal(ivScenarioDashboard.criticalBed.id, "Bed 03");
assert.match(ivScenarioDashboard.criticalBed.nurseTasks[0].label, /Inspect IV/i);

const rushScenario = buildDemoScenarioBeds(beds, "multi-bed-rush");
const rushDashboard = buildDashboardState(rushScenario);
assert.equal(rushDashboard.summary.urgent, 3);
assert.equal(rushDashboard.priorityQueue.length, 3);

console.log("carehub-core tests passed");
