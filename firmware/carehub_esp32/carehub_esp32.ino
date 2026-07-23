const int FSR_PINS[4] = {34, 35, 32, 33};
const int LED_PIN = 2;
const int BUZZER_PIN = 25;

const int PRESSURE_THRESHOLD = 70;
const int SAMPLE_DELAY_MS = 1000;

int zones[4] = {0, 0, 0, 0};
unsigned long highPressureStartedAt = 0;
unsigned long lastMovementAt = 0;

int normalizeFsr(int rawValue) {
  return constrain(map(rawValue, 0, 4095, 0, 100), 0, 100);
}

bool hasHighPressure() {
  for (int index = 0; index < 4; index += 1) {
    if (zones[index] >= PRESSURE_THRESHOLD) return true;
  }
  return false;
}

bool hasMovement(int previousZones[4]) {
  for (int index = 0; index < 4; index += 1) {
    if (abs(zones[index] - previousZones[index]) >= 12) return true;
  }
  return false;
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  lastMovementAt = millis();
}

void loop() {
  int previousZones[4];
  for (int index = 0; index < 4; index += 1) {
    previousZones[index] = zones[index];
    zones[index] = normalizeFsr(analogRead(FSR_PINS[index]));
  }

  if (hasMovement(previousZones)) {
    lastMovementAt = millis();
  }

  if (hasHighPressure()) {
    if (highPressureStartedAt == 0) highPressureStartedAt = millis();
  } else {
    highPressureStartedAt = 0;
  }

  int highDurationSec =
    highPressureStartedAt == 0 ? 0 : (millis() - highPressureStartedAt) / 1000;
  int lastMovementMin = (millis() - lastMovementAt) / 60000;

  int remainingMl = 80;
  int flowMlPerMin = 6;
  bool abnormalFlow = false;

  bool alert = highDurationSec >= 60 || remainingMl <= 50 || abnormalFlow;
  digitalWrite(LED_PIN, alert ? HIGH : LOW);
  digitalWrite(BUZZER_PIN, alert ? HIGH : LOW);

  Serial.print("{\"bedId\":\"Bed 01\",\"pressure\":{\"zones\":[");
  Serial.print(zones[0]);
  Serial.print(",");
  Serial.print(zones[1]);
  Serial.print(",");
  Serial.print(zones[2]);
  Serial.print(",");
  Serial.print(zones[3]);
  Serial.print("],\"highDurationSec\":");
  Serial.print(highDurationSec);
  Serial.print(",\"lastMovementMin\":");
  Serial.print(lastMovementMin);
  Serial.print("},\"iv\":{\"remainingMl\":");
  Serial.print(remainingMl);
  Serial.print(",\"flowMlPerMin\":");
  Serial.print(flowMlPerMin);
  Serial.print(",\"abnormalFlow\":");
  Serial.print(abnormalFlow ? "true" : "false");
  Serial.println("}}");

  delay(SAMPLE_DELAY_MS);
}
