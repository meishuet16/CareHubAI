# CareHub AI Prototype Wiring

## MVP Hardware

| Part | Purpose | Suggested Connection |
| --- | --- | --- |
| ESP32 | Bedside edge controller | USB to laptop |
| 4 FSR pressure sensors | Pressure mat zones | GPIO 34, 35, 32, 33 analog inputs |
| 10k resistors | Voltage divider for FSRs | One per FSR |
| LED | Local bedside alert | GPIO 2 |
| Buzzer | Optional local alert | GPIO 25 |
| Load cell + HX711 | IV bag weight estimate | Add after pressure flow is stable |

## Physical Build

Use a thin foam board or cardboard base, divide it into four labeled zones, and tape one FSR under each zone. The IV module can be shown as a hanging bottle/bag with a small load sensor or as a calibrated simulated value during Phase 1.

## Demo Flow

1. Patient pressure increases on one zone.
2. ESP32 streams the updated zone values.
3. Dashboard Hardware Mode updates Bed 01.
4. AI triage ranks Bed 01 higher.
5. Nurse sees the reason and recommended action.
