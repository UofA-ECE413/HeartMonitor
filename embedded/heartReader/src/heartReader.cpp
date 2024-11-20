#include <Wire.h>
#include "../lib/max30105/src/max30105.h"
#include "../lib/max30105/src/spo2_algorithm.h"

// State Machine Definitions
enum State {
    IDLE,
    FLASHING,
    WAITING_FOR_READING
};

State currentState = IDLE;
unsigned long stateStartTime = 0;
unsigned long flashTimer = 0;

// // Timing Constants
// const unsigned long IDLE_DURATION = 30 * 60 * 1000;  // 30 minutes
// const unsigned long FLASHING_DURATION = 5 * 60 * 1000;  // 5 minutes
// const unsigned long FLASH_INTERVAL = 500;  // 500ms for LED flashing

const unsigned long IDLE_DURATION = 3 * 60 * 1000;  // 3 minutes
const unsigned long FLASHING_DURATION = 1 * 60 * 1000;  // 1 minutes
const unsigned long FLASH_INTERVAL = 500;  // 500ms for LED flashing

// Pin Definitions
const int ledPin = D7;  // Built-in LED

// MAX30105 Sensor Setup
MAX30105 particleSensor;

#define MAX_BRIGHTNESS 255
uint32_t irBuffer[100];  // Infrared LED sensor data
uint32_t redBuffer[100]; // Red LED sensor data
int32_t spo2;            // SPO2 value
int8_t validSPO2;        // Validity of SPO2 calculation
int32_t heartRate;       // Heart rate value
int8_t validHeartRate;   // Validity of heart rate calculation

const byte READ_COUNT_THRESHOLD = 10; // Minimum valid readings required
byte validReadCount = 0;
float totalHeartRate = 0;
float totalSpO2 = 0;

// Setup function
void setup() {
    Serial.begin(115200);

    pinMode(ledPin, OUTPUT);
    digitalWrite(ledPin, LOW);

    if (!particleSensor.begin()) {
        Serial.println("MAX30105 was not found. Please check wiring/power.");
        while (1);
    }

    // Sensor configuration
    particleSensor.setup(60, 4, 2, 100, 411, 4096); // Configure the sensor
    Serial.println("Place your finger on the sensor.");
    currentState = IDLE;
    stateStartTime = millis();
}

// Function to gather valid readings
bool gatherValidReadings() {
    while (particleSensor.available()) {
        redBuffer[validReadCount] = particleSensor.getRed();
        irBuffer[validReadCount] = particleSensor.getIR();
        particleSensor.nextSample(); // Move to next sample

        maxim_heart_rate_and_oxygen_saturation(irBuffer, validReadCount + 1, redBuffer,
                                               &spo2, &validSPO2, &heartRate, &validHeartRate);

        if (validHeartRate && validSPO2) {
            totalHeartRate += heartRate;
            totalSpO2 += spo2;
            validReadCount++;

            // Check if sufficient valid readings are collected
            if (validReadCount >= READ_COUNT_THRESHOLD) {
                return true;
            }
        }
    }
    return false;
}

// Function to calculate averages and publish metrics
void calculateAndPublishMetrics() {
    float avgHeartRate = totalHeartRate / validReadCount;
    float avgSpO2 = totalSpO2 / validReadCount;

    String eventData = String::format("{\"avgHeartRate\": %.2f, \"avgSpO2\": %.2f}", avgHeartRate, avgSpO2);
    Particle.publish("HealthMetrics", eventData, PRIVATE);

    Serial.println(eventData);

    // Reset accumulation variables
    totalHeartRate = 0;
    totalSpO2 = 0;
    validReadCount = 0;
}

// Function to reset the state machine
void resetState() {
    currentState = IDLE;
    stateStartTime = millis();
    validReadCount = 0;
    totalHeartRate = 0;
    totalSpO2 = 0;
    digitalWrite(ledPin, LOW); // Ensure LED is off
}

// Main loop
void loop() {
    unsigned long currentTime = millis();

    switch (currentState) {
        case IDLE:
            // Wait for the 30-minute timer
            if (currentTime - stateStartTime >= IDLE_DURATION) {
                currentState = FLASHING;
                stateStartTime = currentTime;
                flashTimer = currentTime;
            }
            break;

        case FLASHING:
            // Flash LED to prompt user
            if (currentTime - flashTimer >= FLASH_INTERVAL) {
                digitalWrite(ledPin, !digitalRead(ledPin)); // Toggle LED
                flashTimer = currentTime;
            }

            // Transition to WAITING_FOR_READING
            if (currentTime - stateStartTime >= FLASHING_DURATION) {
                currentState = WAITING_FOR_READING;
                stateStartTime = currentTime;
                digitalWrite(ledPin, LOW); // Turn off LED
            }
            break;

        case WAITING_FOR_READING:
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