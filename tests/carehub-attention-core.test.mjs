import assert from "node:assert/strict";
import {
  acknowledgeBed,
  applyBedsidePacket,
  buildAttentionDashboardState,
  evaluateBedAttention,
  normalizeBedsidePacket,
} from "../carehub-attention-core.js";

const pressureHigh = {
  id: "Bed A",
  patient: "Pressure Case",
  pressure: { zones: [22, 44, 86, 92], highDurationSec: 6000, lastMovementMin: 102 },
  iv: { remainingMl: 220, flowMlPerMin: 6, abnormalFlow: false },
  patientContext: {
    pressureRiskBand: "high",
    mobility: "very limited",
    canSelfReposition: false,
    fixedPosition: false,
    infusionContext: "routine hydration",
  },
  wetnessDetected: false,
  callActive: false,
  acknowledged: false,
};

const ivAbnormal = {
  id: "Bed B",
  patient: "IV Case",
  pressure: { zones: [20, 26, 31, 28], highDurationSec: 0, lastMovementMin: 8 },
  iv: { remainingMl: 120, flowMlPerMin: 0, abnormalFlow: true },
  patientContext: {
    pressureRiskBand: "lower",
    mobility: "independent",
    canSelfReposition: true,
    fixedPosition: false,
    infusionContext: null,
  },
  wetnessDetected: false,
  callActive: false,
  acknowledged: false,
};

const stable = {
  id: "Bed C",
  patient: "Stable Case",
  pressure: { zones: [18, 22, 30, 26], highDurationSec: 0, lastMovementMin: 10 },
  iv: { remainingMl: 260, flowMlPerMin: 6, abnormalFlow: false },
  patientContext: {
    pressureRiskBand: "lower",
    mobility: "independent",
    canSelfReposition: true,
    fixedPosition: false,
    infusionContext: "routine hydration",
  },
  wetnessDetected: false,
  callActive: false,
  acknowledged: false,
};

const callCase = {
  ...stable,
  id: "Bed D",
  patient: "Call Case",
  callActive: true,
};

const evaluatedPressure = evaluateBedAttention(pressureHigh);
assert.equal(evaluatedPressure.level, "High attention");
assert.match(evaluatedPressure.explanation, /sustained pressure/i);
assert.match(evaluatedPressure.recommendedAction, /posture|pressure/i);
assert.equal(evaluatedPressure.pressure.exposureMin, 100);
assert.equal(evaluatedPressure.pressure.movementGapMin, 102);
assert.equal(evaluatedPressure.missingContext.length, 0);

const evaluatedIv = evaluateBedAttention(ivAbnormal);
assert.equal(evaluatedIv.level, "Review");
assert.match(evaluatedIv.explanation, /IV flow/i);
assert.equal(evaluatedIv.confidence, "Limited context");
assert.deepEqual(evaluatedIv.missingContext, ["infusion clinical context"]);

const evaluatedStable = evaluateBedAttention(stable);
assert.equal(evaluatedStable.level, "Stable");
assert.equal(evaluatedStable.activeSignalCount, 0);

const evaluatedCall = evaluateBedAttention(callCase);
assert.equal(evaluatedCall.level, "Immediate review");
assert.match(evaluatedCall.explanation, /Patient call/i);

const dashboard = buildAttentionDashboardState([pressureHigh, ivAbnormal, stable, callCase]);
assert.equal(dashboard.attentionQueue[0].id, "Bed D");
assert.equal(dashboard.attentionQueue[1].id, "Bed A");
assert.equal(dashboard.summary.totalBeds, 4);
assert.equal(dashboard.summary.immediate, 1);
assert.equal(dashboard.summary.high, 1);
assert.equal(dashboard.summary.review, 1);
assert.equal(dashboard.summary.stable, 1);
assert.equal(dashboard.summary.activeNeeds, 3);

const acknowledged = acknowledgeBed([pressureHigh, stable], "Bed A");
const acknowledgedState = buildAttentionDashboardState(acknowledged);
assert.equal(acknowledgedState.beds[0].level, "Acknowledged");
assert.equal(acknowledgedState.attentionQueue.length, 0);

const normalized = normalizeBedsidePacket({
  bedId: "Bed A",
  pressure: {
    zones: [-12, 45.4, 109, "bad"],
    highDurationSec: 5700,
    lastMovementMin: 95.6,
  },
  iv: {
    remainingMl: "44.4",
    flowMlPerMin: 0,
    abnormalFlow: "yes",
  },
  wetnessDetected: true,
  callActive: false,
});

assert.deepEqual(normalized, {
  bedId: "Bed A",
  pressure: {
    zones: [0, 45, 100, 0],
    highDurationSec: 5700,
    lastMovementMin: 96,
  },
  iv: {
    remainingMl: 44,
    flowMlPerMin: 0,
    abnormalFlow: true,
  },
  wetnessDetected: true,
  callActive: false,
});

assert.equal(normalizeBedsidePacket({ bedId: "Bed X", pressure: { zones: [1, 2] } }), null);

const updated = applyBedsidePacket([pressureHigh, stable], {
  bedId: "Bed A",
  pressure: { zones: [10, 20, 80, 90], highDurationSec: 6300, lastMovementMin: 110 },
  iv: { remainingMl: 35, flowMlPerMin: 5, abnormalFlow: false },
  wetnessDetected: false,
  callActive: true,
});

assert.deepEqual(updated[0].pressure.zones, [10, 20, 80, 90]);
assert.equal(updated[0].iv.remainingMl, 35);
assert.equal(updated[0].callActive, true);
assert.equal(updated[0].acknowledged, false);
assert.deepEqual(updated[1], stable);

console.log("carehub attention core tests passed");
