# CareHub AI Hardware Demo Runbook

## Before Demo

1. Open the dashboard in Simulated Mode.
2. Run `npm run bridge:mock` for backup.
3. Confirm `http://localhost:3001/latest` returns a JSON packet.
4. Plug in the ESP32 and verify Serial output in Arduino IDE.

## Live Demo Path

1. Click `Use Hardware`.
2. Press one pressure zone until Bed 01 becomes higher priority.
3. Show the dashboard reason: pressure zone, IV state, score, and nurse action.
4. Click `Acknowledge` to show the nurse workflow.
5. Reset to return to the starting ward state.

## Backup Path

If sensors fail, keep the mock bridge running and explain that the dashboard is reading the same protocol the ESP32 emits.
