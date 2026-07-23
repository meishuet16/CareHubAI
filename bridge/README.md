# CareHub AI Bridge

The dashboard can run in two modes:

- Simulated Mode: static demo data, no hardware required.
- Hardware Mode: dashboard polls `http://localhost:3001/latest` once per second.

For rehearsal without ESP32, run:

```bash
npm run bridge:mock
```

Then open `index.html`, click `Use Hardware`, and Bed 01 will update from the mock bedside stream.

Expected JSON shape:

```json
{
  "connected": true,
  "receivedAt": "2026-07-23T13:00:00.000Z",
  "reading": {
    "bedId": "Bed 01",
    "pressure": {
      "zones": [22, 68, 91, 44],
      "highDurationSec": 75,
      "lastMovementMin": 28
    },
    "iv": {
      "remainingMl": 42,
      "flowMlPerMin": 6,
      "abnormalFlow": false
    }
  }
}
```
