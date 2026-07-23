# CareHub AI Calibration Notes

## Pressure Mat

1. Record the raw analog value with no load.
2. Record the raw analog value under light, medium, and high pressure.
3. Adjust the ESP32 `map()` range if normal touch reads too high or too low.
4. Treat sustained high pressure for 60 seconds as an urgent demo trigger.

## IV Monitoring

For the first prototype, IV readings can be simulated or estimated from a load cell. The dashboard expects:

- `remainingMl`: estimated fluid volume.
- `flowMlPerMin`: recent flow trend.
- `abnormalFlow`: `true` when flow is paused, too fast, or sensor trend is suspicious.

The system should alert the nurse to check the IV. It should not automatically control the drip rate.
