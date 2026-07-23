# Hardware Integration Notes

The current dashboard uses simulated data. Physical integration can map ESP32 readings into the same bed data structure.

Suggested mapping:

- FSR analog readings become `pressure.zones`.
- High pressure timer becomes `pressure.highDurationSec`.
- Load cell readings become `iv.remainingMl`.
- Flow sensor readings become `iv.flowMlPerMin`.
- Sensor error states become `iv.abnormalFlow`.
