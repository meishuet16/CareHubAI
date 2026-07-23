# CareHub AI Hardware Data Protocol

CareHub keeps the hardware protocol small so the prototype is easy to explain to judges.

## Bedside Packet

The ESP32 sends one JSON line per second over USB serial:

```json
{
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
```

## Dashboard Handling

- Values are sanitized before scoring.
- Pressure zones are clamped to `0-100`.
- Invalid packets are ignored.
- New hardware packets reset the selected bed's `acknowledged` state.
- Hardware mode is optional; simulated mode remains available for presentation backup.
