# System Architecture

```text
[Pressure Sensor Mat]          [IV Drip Sensor]
          ↓                           ↓
      [ESP32 Microcontroller / Edge Node]
          ↓
 [Data Cleaning + Feature Extraction]
          ↓
        [CareHub AI Risk Engine]
          ↓
 [Alert Priority + Explanation Generator]
          ↓
      [Nurse Dashboard]
          ↓
 [Nurse / Caregiver Action]
```

The dashboard in this repository simulates the nurse interface and the AI risk engine. Future hardware integration can send real ESP32 sensor readings into the same dashboard model.
