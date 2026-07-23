import assert from "node:assert/strict";
import {
  buildDashboardState,
  calculateBedRisk,
  acknowledgeAlert,
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

console.log("carehub-core tests passed");
