#include <Wire.h>
#include "../lib/max30105/src/max30105.h"
#include "../lib/max30105/src/spo2_algorithm.h"

// State Machine Definition
enum State {
  IDLE,
  WAITING_FOR_READING
};

struct SensorData { //our data type
  float heartRate;
  float spo2;
};

SensorData localData[100]; //array to store data
int dataIndex = 0;         //index to keep trrack of data
bool storedData = false;

State currentState = IDLE;
unsigned long stateStartTime = 0;
unsigned long flashTimer = 0;

// Timing Constants
double frequency = 30;
long IDLE_DURATION = frequency * 60 * 1000;  // 30 minutes
const unsigned long FLASHING_DURATION = 5 * 60 * 1000;  // 5 minutes
const unsigned long FLASH_INTERVAL = 500;  // 500ms for LED flashing

const int TIMEZONE_OFFSET = -7 * 3600;

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

int setFrequency(String inputFrequency);

int startTimeInSeconds = 21600;  //6am
int endTimeInSeconds = 79200;  //10pm

int setActiveTime(String command);

int getSecondsSinceMidnight();

// Setup function
void setup() {
  Serial.begin(115200);

  pinMode(ledPin, OUTPUT);
  pinMode(pulseLED, OUTPUT);
  digitalWrite(ledPin, LOW);
  RGB.control(true); //Control the rgb led on the Argon

  if (!particleSensor.begin()) {
    Serial.println("MAX30105 was not found. Please check wiring/power.");
    while (1);
  }

  // Sensor configuration
  particleSensor.setup(60, 4, 2, 100, 411, 4096); 
  currentState = IDLE;
  stateStartTime = millis();

  // Register Particle Cloud API functions and variables
  Particle.function("frequency", setFrequency);
  Particle.variable("frequency", frequency);

  Particle.function("setTimeRange", setActiveTime);

  Particle.variable("startTime", startTimeInSeconds);
  Particle.variable("endTime", endTimeInSeconds);
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
  bool success = Particle.publish("reading", eventData, PRIVATE);

  // If data is successfully published, briefly flash RGB LED green
  if (success) {
    for(int i = 5; i > 0; i--){
      RGB.color(0, 255, 0);
      delay(500);
      RGB.color(0, 0, 0);
      delay(500);
    }
  }

  Serial.println(eventData);

  // Reset accumulation variables
  totalHeartRate = 0;
  totalSpO2 = 0;
  validReadCount = 0;
}

//store data  when not connected to wifi
void storeData() {
  Serial.println("Storing data");
  Serial.println("Calculating and publishing metrics");
  float avgHeartRate = totalHeartRate / validReadCount;
  float avgSpO2 = totalSpO2 / validReadCount;

  //make sure there is room in the array
  if (dataIndex < 100) { 
    localData[dataIndex].heartRate = heartRate;
    localData[dataIndex].spo2 = spo2;
    dataIndex++;
    Serial.println("Store Data Successful");
    storedData = true;
  } 
  else {
    Serial.println("Data storage full, unable to store new readings");
  }
}

// Upload data stored while not on WiFi
void uploadData() {
  Serial.println("Uploading Stored Data... Please be patient");

  for(int i = 0; i < dataIndex; i++){
    String eventData = String::format("{\"heartRate\": %.2f, \"spo2\": %.2f}", localData[i].heartRate, localData[i].spo2);
    Particle.publish("reading", eventData, PRIVATE);
    Serial.println(eventData);
    localData[i].heartRate = NULL;
    localData[i].spo2 = NULL;
    delay(750);
  }

  dataIndex = 0;
  storedData = false;
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

  // If device is not connected to WiFi
  if(!WiFi.ready()){
    // Flash RGB LED Yellow to indicate WiFi connection not avalable
    for(int i = 5; i > 0; i--){
      RGB.color(255, 255, 0);
      delay(500);
      RGB.color(0, 0, 0);
      delay(500);
    }
    
    if (gatherValidReadings()) {
      storeData();
      resetState();
    }

    if (currentTime - stateStartTime >= FLASHING_DURATION) {
      resetState();
    }
  }
  // If device is connected to WiFi
  else {

    Serial.println("Starting New Scan with WiFi");

    int currentSeconds = getSecondsSinceMidnight();

    // Only proceed if the current time falls within the active range
    if (currentSeconds >= startTimeInSeconds && currentSeconds <= endTimeInSeconds) {

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
          //Upload stored data
          if(storedData){
            uploadData();
          }

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
    } else {
      // If outside the range, stay in IDLE
      if (currentState != IDLE) {
        resetState();
      }
      Serial.println("Outside active time range. Remaining in IDLE.");
    }
  }
}

// Exposed function to set measurement frequency from website
int setFrequency(String inputFrequency) {
  float frequencyValue = inputFrequency.toFloat();
  

  if (frequencyValue > 0) {
    frequency = frequencyValue;
    IDLE_DURATION = frequency * 60 * 1000;
    Serial.println("Set frequency to " + String(frequency));
    return 1; 
  } else {
    return -1;  
  }
}

// Get time since midnight in seconds
int getSecondsSinceMidnight() {
    time32_t currentTime = Time.local() + TIMEZONE_OFFSET; // Get the current local time as a timestamp

    // Convert time32_t to time_t if necessary
    time_t convertedTime = static_cast<time_t>(currentTime);

    // Convert to a time structure
    tm *timeStruct = localtime(&convertedTime);

    // Extract hours, minutes, and seconds from the time structure
    int currentHour = timeStruct->tm_hour;
    int currentMinute = timeStruct->tm_min;
    int currentSecond = timeStruct->tm_sec;

    // Calculate the total seconds since midnight
    int secondsSinceMidnight = (currentHour * 3600) + (currentMinute * 60) + currentSecond;

    // Debugging prints
    Serial.println(secondsSinceMidnight);
    Serial.println(String(currentHour) + ":" + String(currentMinute) + ":" + String(currentSecond));

    return secondsSinceMidnight;
}

// Exposed function to set measurement time range from website
int setActiveTime(String command) {
  int separatorIndex = command.indexOf(',');
  if (separatorIndex == -1) {
    return -1; // Invalid format
  }

  String startStr = command.substring(0, separatorIndex);
  String endStr = command.substring(separatorIndex + 1);

  // Convert string in format "HH:MM,HH:MM" to start time and end time in seconds
  int startHour = startStr.substring(0, 2).toInt();
  int startMinute = startStr.substring(3, 5).toInt();
  int endHour = endStr.substring(0, 2).toInt();
  int endMinute = endStr.substring(3, 5).toInt();

  startTimeInSeconds = (startHour * 3600) + (startMinute * 60);
  endTimeInSeconds = (endHour * 3600) + (endMinute * 60);

  return 1; // Success
}