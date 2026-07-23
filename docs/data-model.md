# Data Model

Each bed uses this shape:

```js
{
  id: "Bed 01",
  patient: "Aisyah Rahman",
  pressure: {
    zones: [18, 26, 34, 29],
    highDurationSec: 0,
    lastMovementMin: 6
  },
  iv: {
    remainingMl: 210,
    flowMlPerMin: 6,
    abnormalFlow: false
  },
  acknowledged: false
}
```

The same structure can support simulated data and future hardware data.
