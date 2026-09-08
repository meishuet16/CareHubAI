# CareHub AI

CareHub is a prototype bedside attention-support dashboard for nurses. It combines monitored pressure, IV, wetness and patient-call signals with limited patient context, then surfaces explainable bedside needs for nurse review.

The prototype is **not** an autonomous clinical triage system and does not claim to determine a patient's overall clinical urgency. Final prioritisation and care decisions remain with healthcare professionals.

## Current v2 direction

- Pressure monitoring: relative pressure distribution, sustained exposure and movement-gap signals.
- Patient context: clinician-entered pressure-risk band, mobility, self-reposition ability and care constraints.
- IV monitoring: remaining-fluid estimate and abnormal-flow signal.
- Direct bedside events: wetness and patient-call inputs when available.
- Explainable Care Attention Queue: shows which monitored needs deserve review and why, without presenting a fabricated clinical-risk percentage.
- Missing-context handling: the dashboard explicitly shows when the prototype does not have enough clinical context to make a stronger recommendation.

The active dashboard uses:

- `carehub-attention-core.js` — context-aware attention logic.
- `dashboard-v2.js` — nurse-facing dashboard rendering and simulated/hardware modes.
- `index.html` — v2 dashboard shell.

The earlier `carehub-core.js` and `app.js` remain in the repository for Phase 1 reference but are no longer loaded by `index.html` on the rescue branch.

## Run the Dashboard

Open `index.html` through a local web server so ES modules can load correctly. For example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Hardware Mode

For a rehearsal stream without ESP32 hardware:

```bash
npm run bridge:mock
```

The dashboard polls `http://localhost:3001/latest` when Hardware Mode is enabled.

ESP32 firmware and existing build notes are in:

- `firmware/carehub_esp32/carehub_esp32.ino`
- `docs/hardware/wiring.md`
- `docs/hardware/data-protocol.md`
- `docs/hardware/calibration.md`

## Important prototype boundary

CareHub may support pattern recognition from pressure-mat data in later integration, but the attention engine is intentionally explainable and human-in-the-loop. Rules that affect clinical workflow still require review against healthcare guidance and, ideally, feedback from registered nurses before any stronger clinical claim is made.

## Checks

```bash
npm test
npm run check
```
