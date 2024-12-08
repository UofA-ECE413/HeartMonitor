#include <Wire.h>
#include "../lib/max30105/src/max30105.h"
#include "../lib/max30105/src/spo2_algorithm.h"

// State Machine Definition
enum State {
  IDLE,
  WAITING_FOR_READING
};

State currentState = IDLE;
unsigned long stateStartTime = 0;
unsigned long flashTimer = 0;

// // Timing Constants
// const unsigned long IDLE_DURATION = 30 * 60 * 1000;  // 30 minutes
// const unsigned long FLASHING_DURATION = 5 * 60 * 1000;  // 5 minutes
// const unsigned long FLASH_INTERVAL = 500;  // 500ms for LED flashing

const unsigned long IDLE_DURATION = .5 * 60 * 1000;  // .5 minutes
const unsigned long FLASHING_DURATION = 2 * 60 * 1000;  // 2 minutes
const unsigned long FLASH_INTERVAL = 500;  // 500ms for LED flashing

// Pin Definitions
const int ledPin = D7;  // Built-in LED

// MAX30105 Sensor 
MAX30105 particleSensor;

#define MAX_BRIGHTNESS 255
uint32_t irBuffer[200]; 
uint32_t redBuffer[200]; 
int32_t spo2;          
int8_t validSPO2;      
int32_t heartRate;      
int8_t validHeartRate;   

const byte READ_COUNT_THRESHOLD = 10; // CHANGE: Minimum valid readings required
byte validReadCount = 0;
float totalHeartRate = 0;
float totalSpO2 = 0;

byte pulseLED = 11; 

// Setup function
void setup() {
  Serial.begin(115200);

  pinMode(ledPin, OUTPUT);
  pinMode(pulseLED, OUTPUT);
  digitalWrite(ledPin, LOW);

  if (!particleSensor.begin()) {
    Serial.println("MAX30105 was not found. Please check wiring/power.");
    while (1);
  }

  // Sensor configuration
  particleSensor.setup(60, 4, 2, 100, 411, 4096); 
  currentState = IDLE;
  stateStartTime = millis();
}

// Toggle LED on/off every FLASH_INTERVAL
void toggleFlash() {
  unsigned long currentTime = millis();

  if (currentTime - flashTimer >= FLASH_INTERVAL) {
    digitalWrite(ledPin, !digitalRead(ledPin)); 
    flashTimer = currentTime;
  }
}

// Function to gather readings, returns true when READ_COUNT_THRESHOLD valid readings have been recorded
bool gatherValidReadings() {
  Serial.println("Gathering valid readings");
  // Read the first 100 samples, and determine the signal range
  for (byte i = 0 ; i < 100 ; i++) {
    toggleFlash();
    while (particleSensor.available() == false) {
      particleSensor.check(); 
    }

    redBuffer[i] = particleSensor.getRed();
    irBuffer[i] = particleSensor.getIR();
    particleSensor.nextSample();

    Serial.print(i, DEC);
    Serial.print(F("red="));
    Serial.print(redBuffer[i], DEC);
    Serial.print(F(", ir="));
    Serial.println(irBuffer[i], DEC);
  }

  // Calculate heart rate and SpO2 after first 100 samples 
  maxim_heart_rate_and_oxygen_saturation(irBuffer, 100, redBuffer, &spo2, &validSPO2, &heartRate, &validHeartRate);

  while(millis() - stateStartTime <= FLASHING_DURATION) {
    // Dumping the first 25 sets of samples in the memory and shift the last 75 sets of samples to the top
    for (byte i = 25; i < 100; i++) {
      toggleFlash();
      redBuffer[i - 25] = redBuffer[i];
      irBuffer[i - 25] = irBuffer[i];
    }

    for (byte i = 75; i < 100; i++) {
      toggleFlash();
      while (particleSensor.available() == false) {
        particleSensor.check(); 
      }

      redBuffer[i] = particleSensor.getRed();
      irBuffer[i] = particleSensor.getIR();
      particleSensor.nextSample(); 

      Serial.print(F("red="));
      Serial.print(redBuffer[i], DEC);
      Serial.print(F(", ir="));
      Serial.print(irBuffer[i], DEC);

      Serial.print(F(", HR="));
      Serial.print(heartRate, DEC);

      Serial.print(F(", HRvalid="));
      Serial.print(validHeartRate, DEC);

      Serial.print(F(", SPO2="));
      Serial.print(spo2, DEC);

      Serial.print(F(", SPO2Valid="));
      Serial.println(validSPO2, DEC);
    }

    // Record valid readings
    if (validHeartRate && validSPO2) {
      totalHeartRate += heartRate;
      totalSpO2 += spo2;
      validReadCount++;

      // Check if sufficient valid readings are collected
      if (validReadCount >= READ_COUNT_THRESHOLD) {
        return true;
      }
    }

    // Calculate heart rate and SpO2
    maxim_heart_rate_and_oxygen_saturation(irBuffer, 100, redBuffer, &spo2, &validSPO2, &heartRate, &validHeartRate);
  }
  return false;
}

// Function to calculate averages and publish metrics
void calculateAndPublishMetrics() {
  Serial.println("Calculating and publishing metrics");
  float avgHeartRate = totalHeartRate / validReadCount;
  float avgSpO2 = totalSpO2 / validReadCount;

  // Publish data as JSON to webhook registered to addData endpoint
  String eventData = String::format("{\"heartRate\": %.2f, \"spo2\": %.2f}", avgHeartRate, avgSpO2);
  Particle.publish("reading", eventData, PRIVATE);

  Serial.println(eventData);

  // Reset accumulation variables
  totalHeartRate = 0;
  totalSpO2 = 0;
  validReadCount = 0;
}

// Function to reset state and variables
void resetState() {
  Serial.println("Resetting state");
  currentState = IDLE;
  stateStartTime = millis();
  validReadCount = 0;
  totalHeartRate = 0;
  totalSpO2 = 0;
  digitalWrite(ledPin, LOW);
}

// Main loop
void loop() {
  unsigned long currentTime = millis();

  switch (currentState) {
    case IDLE:
      Serial.println("Idle");

      // Wait for IDLE_DURATION (default 30 minutes)
      if (currentTime - stateStartTime >= IDLE_DURATION) {
        currentState = WAITING_FOR_READING;
        stateStartTime = currentTime;
        flashTimer = currentTime;
      }
      break;

    case WAITING_FOR_READING:
      Serial.println("Waiting for reading");

      // Start flashing led and waiting for valid metrics
      if (gatherValidReadings()) {
        calculateAndPublishMetrics();
        resetState();
      }

      // Timeout if no valid readings within 5 minutes
      if (currentTime - stateStartTime >= FLASHING_DURATION) {
        resetState();
      }
      break;
  }
}