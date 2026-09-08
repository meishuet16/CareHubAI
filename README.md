# 🩺 CareHub AI

**CareHub** is an AI-assisted bedside monitoring and nurse attention-support prototype built for **Project Nexus 2026 — Healthcare Technology**.

The idea is simple: instead of making nurses look at separate pressure, IV and bedside signals one by one, CareHub brings them into one place, adds patient context, and turns them into **clear, explainable attention cues**.

> CareHub does **not** decide who is the most clinically urgent patient. It surfaces monitored bedside needs and leaves final clinical prioritisation and care decisions to nurses.

---

## 🚨 The Problem

Nurses often need to monitor several patients at the same time, while bedside conditions can change between routine checks.

A few examples:

- a patient has been lying in the same pressure pattern for too long;
- movement has reduced significantly;
- an IV bag is almost empty or the flow becomes abnormal;
- a wetness signal is detected;
- a patient presses the call button.

The issue is not just **collecting data**. If every sensor produces its own alert, nurses still have to mentally connect the dots themselves.

### So our problem statement is:

> **How might we continuously monitor important bedside signals, interpret them with relevant patient context, and surface clear, explainable attention needs without replacing clinical judgement?**

CareHub focuses on three main gaps:

| Gap | What happens now | What CareHub tries to improve |
| --- | --- | --- |
| 👀 Continuous visibility | Conditions may change between manual checks | Continuous bedside monitoring |
| 🧩 Fragmented information | Pressure, IV and other signals are separate | One combined nurse-facing view |
| 💡 Explainability | A number or alert alone may not tell nurses enough | Show the signal, context and reason behind the attention state |

---

## 💡 Our Solution

CareHub follows one clear flow:

**Bedside sensors → Signal interpretation → Patient context → Care Attention → Nurse review**

### 🛏️ Smart Pressure Mat

The pressure-mat view visualises an **8 × 8 relative pressure field** and is designed to support pressure-pattern interpretation such as:

- posture;
- sustained pressure exposure;
- movement / redistribution gaps.

The current dashboard still uses prototype/demo pressure values, but the UI is already structured so a trained pressure model can later plug in and provide outputs such as posture or persistent-pressure states.

### 💧 Smart IV Monitor

The IV monitor uses a load-cell-based setup to track:

- estimated remaining fluid;
- flow behaviour;
- abnormal or interrupted flow.

This part is intentionally straightforward — not everything needs to be called “AI”. If a deterministic sensor rule is clearer and safer, we use that.

### 📣 Patient Call + Other Bedside Signals

Patient-call and wetness events can also enter the same attention flow, so nurses do not need a separate screen for every bedside signal.

### 🧠 Explainable Care Attention

Instead of giving every patient a mysterious `87/100 risk score`, CareHub evaluates monitored needs individually and surfaces states such as:

- **High Attention**
- **Review / Watch**
- **Stable**

For every attention state, the dashboard tries to answer:

1. **What signal changed?**
2. **What did CareHub interpret from it?**
3. **What patient context matters?**
4. **Why is this being surfaced now?**
5. **What should the nurse review next?**

---

## 🖥️ Dashboard

The dashboard has two main views.

### 1️⃣ Ward Overview

This is the first screen nurses see. It gives a ward-level picture of all monitored beds and helps them quickly scan what is happening.

It includes:

- 2.5D **Ward Digital Twin**;
- ward summary;
- **Care Attention Queue**;
- live processing flow;
- event history;
- bed-level status at a glance.

![CareHub Ward Overview](assets/dashboard.jpg)

### 2️⃣ Bed Detail

Clicking a bed opens a focused view for that patient.

It includes:

- Smart Pressure Mattress visualisation;
- posture interpretation;
- IV monitoring;
- patient context;
- explainable attention reasoning;
- recommended nurse review workflow;
- acknowledgement flow.

![CareHub Bed Detail](assets/dashboard%20detail.jpg)

---

## 👩‍⚕️ User Flow

A normal CareHub flow looks like this:

```text
Patient / bedside condition changes
                ↓
Pressure mat / IV monitor / call button captures a signal
                ↓
ESP32 / data bridge sends a standardised bedside packet
                ↓
CareHub interprets the monitored signal
                ↓
Relevant patient context is applied
                ↓
An explainable Care Attention state is surfaced
                ↓
Nurse sees the affected bed in Ward Overview / Care Attention Queue
                ↓
Nurse opens Bed Detail
                ↓
Signal → interpretation → context → attention is shown
                ↓
Nurse reviews the patient using clinical judgement
                ↓
Nurse acknowledges the monitored need
                ↓
Continuous monitoring continues
```

### Example A — Persistent pressure pattern

```text
Pressure distribution persists + movement gap increases
                         ↓
CareHub detects a sustained pressure pattern
                         ↓
Context: high pressure-risk band + very limited mobility
                         ↓
HIGH ATTENTION
Persistent pressure pattern requires review
                         ↓
Nurse opens Bed Detail and reviews posture / skin condition /
positioning plan before acknowledging the monitored need
```

### Example B — IV change

```text
Load cell detects low remaining fluid or abnormal flow
                         ↓
IV state changes
                         ↓
CareHub surfaces the monitored IV need
                         ↓
Nurse opens Bed Detail and reviews the patient, IV bag and line
```

---

## 🧩 How It Fits Together

```text
┌─────────────────────────────────────────────────────────┐
│                    BEDSIDE HARDWARE                     │
│  Pressure Mat        IV Load Cell       Call / Wetness │
└───────────────┬─────────────────────────────────────────┘
                │ ESP32 / standardised JSON packet
                ▼
┌─────────────────────────────────────────────────────────┐
│                  INTERPRETATION LAYER                   │
│  Pressure pattern / posture   │   IV monitored state   │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   PATIENT CONTEXT                       │
│ Pressure risk · Mobility · Self-reposition · Constraints│
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 CARE ATTENTION ENGINE                   │
│ Explainable monitored needs · Missing-context handling │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    NURSE DASHBOARD                      │
│ Ward Overview → Bed Detail → Review → Acknowledge      │
└─────────────────────────────────────────────────────────┘
```

### Main dashboard files

| File | Role |
| --- | --- |
| `carehub-attention-core.js` | Explainable attention logic |
| `dashboard-v2.js` | Dashboard state, demo/hardware data and rendering |
| `dashboard-navigation.js` | Ward Overview ↔ Bed Detail navigation |
| `demo-visuals.js` | Pressure, posture, IV and processing-flow visuals |
| `index.html` | Dashboard shell |
| `real-render-corrections.css/js` | Final browser-tested UI corrections |

The older `carehub-core.js` and `app.js` are kept only as Phase 1 reference and are not loaded by the current dashboard.

---

## 🔌 Data + Hardware Integration

The dashboard is designed around **standardised bedside data** instead of tying the UI directly to raw sensor wiring.

A current ESP32 bridge packet looks like this:

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

For the current demo, four pressure zones are expanded visually into an 8 × 8 field. Later, the same UI can consume the real pressure matrix or trained pressure-model output without changing the overall nurse workflow.

Hardware notes are here:

- `firmware/carehub_esp32/carehub_esp32.ino`
- `docs/hardware/wiring.md`
- `docs/hardware/data-protocol.md`
- `docs/hardware/calibration.md`

---

## 🚀 Run / Deploy

CareHub uses JavaScript ES modules, so **do not double-click `index.html` directly** using `file://`. Some browsers will block the module imports and you will only see the static HTML shell.

### Option A — Local demo

From the repository root:

```bash
python -m http.server 8080
```

On Windows, if `python` does not work:

```bash
py -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

The dashboard starts in **Simulated Mode** with four demo beds, so it can still be presented even without physical hardware connected.

### Option B — Hardware rehearsal

Start the mock/data bridge:

```bash
npm run bridge:mock
```

Then switch the dashboard to Hardware Mode. The current bridge endpoint is:

```text
http://localhost:3001/latest
```

### Option C — Static deployment

There is no build step, so the dashboard can be hosted on any static host, for example:

- Vercel
- Netlify
- GitHub Pages
- any normal HTTP/HTTPS web server

For deployment, make sure:

- `index.html` stays at the project root;
- relative `.js` and `.css` paths are preserved;
- JavaScript modules are served over HTTP/HTTPS;
- Hardware Mode uses a reachable API endpoint rather than another machine's `localhost:3001`;
- CORS/network access is configured if the bridge is hosted separately.

💡 **Competition fallback:** Simulated Mode is intentionally kept so the full nurse workflow can still be demonstrated even if hardware connectivity fails on demo day.

---

## 🎬 Suggested Demo Flow

For a short competition demo:

1. Open **Ward Overview** and show the four monitored beds.
2. Trigger a persistent pressure scenario for Bed 02.
3. Show the Ward Digital Twin and Care Attention Queue update.
4. Open **Bed 02 Detail**.
5. Walk through pressure distribution, posture, movement gap and patient context.
6. Show the explainable chain: **signal → interpretation → context → attention**.
7. Acknowledge the monitored need.
8. Trigger an IV abnormal-flow / low-volume scenario and show the dashboard update again.

This keeps the story focused on one thing: **CareHub turns bedside signals into explainable nurse attention support.**

---

## ✅ Current Status

### Already implemented

- Multi-bed Ward Overview
- 2.5D Ward Digital Twin
- Bed-specific Detail views
- Explainable Care Attention engine
- Pressure-mat visualisation
- Posture interpretation UI
- IV monitoring visualisation
- Patient-context handling
- Care Attention Queue
- Event log
- Acknowledge workflow
- Simulated scenarios
- Hardware bridge boundary
- Responsive browser UI

### Still needed before real-world clinical use

- Real 8 × 8 pressure-mat hardware stream
- Trained pressure/posture model output
- Full physical ESP32 end-to-end integration
- Production backend / persistence
- Clinical workflow validation
- Medical-device-grade safety, security and regulatory validation

---

## 🧪 Checks

```bash
npm test
npm run check
```

CareHub is currently a **competition prototype and decision-support demonstration**, not a clinically deployed medical device.
