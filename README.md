# CareHub AI

CareHub AI is a prototype nurse-station dashboard for an AI-assisted smart bedside nursing assistant.

The prototype demonstrates three core ideas:

- Pressure-ulcer risk monitoring through a 4-zone pressure map.
- IV drip status monitoring through remaining-time and abnormal-flow signals.
- AI-style alert prioritization that helps nurses decide which bed needs attention first.

## Run the Dashboard

Open `index.html` in a browser to view the dashboard in Simulated Mode.

## Hardware Mode

For a rehearsal stream without ESP32 hardware:

```bash
npm run bridge:mock
```

Then open `index.html` and click `Use Hardware`. The dashboard polls
`http://localhost:3001/latest` and updates Bed 01 from the mock bedside packet.

ESP32 firmware and build notes are in:

- `firmware/carehub_esp32/carehub_esp32.ino`
- `docs/hardware/wiring.md`
- `docs/hardware/data-protocol.md`
- `docs/hardware/calibration.md`

## Checks

Run:

```bash
npm test
npm run check
```
