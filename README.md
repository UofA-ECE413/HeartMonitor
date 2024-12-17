# Project README

## Project Overview
The Heart Track application is a low-cost IoT-enabled web app for monitoring heart rate and blood oxygen saturation levels throughout the day at a user rate.

### Key Features:
- **IoT-enabled heart rate and oxygen sensor integration**
- **Configurable measurement scheduling**
- **Real-time data transmission to a web application**
- **Responsive web application design for desktop, tablet, and mobile devices**

## Project Pitch
Introducing Heart Track: an affordable and innovative solution for monitoring heart rate and blood oxygen saturation levels. Designed for users and physicians alike, this IoT-enabled platform seamlessly integrates hardware and software to deliver real-time insights into cardiovascular health.

With Heart Track, users can:
- Define measurement schedules tailored to their needs.
- View their data through a responsive, easy-to-use web interface on any device.

This project prioritizes accessibility and precision, empowering users to take charge of their health conveniently and efficiently.

## Links
Explore the system in action:
- [Project Server](http://ec2-3-19-120-243.us-east-2.compute.amazonaws.com:3000)
- [Pitch](https://youtu.be/b3MiENMf4rY) - Project Pitch
- [Demo](https://youtu.be/dJEOM3U_T4M) - Demonstration Video

## Login Credentials
Use the following credentials to log in and explore the system with recently collected data:

- **Email**: `demail@gmail.com`
- **Password**: `Password1!`

## To Run Heart Track
1. Clone the repository
    * ```git clone https://github.com/UofA-ECE413/HeartMonitor.git```
2. Switch to the HeartMonitor/app directory
    * ```cd HeartMonitor/app```
3. Run the program
    * ```npm start```

## Endpoints
- /patients/signUp (POST)
    - Behavior: Checks if an account already exists under the given email. If the account exists then an error message will be returned, otherwise the account is created using the email and the (hashed) password.
    - Expected parameters: Expects an email and password passed in the body of the POST request.
    - Responses: 401 (email already exists), 201 (patient account has been created), 400 (error creating patient, error searching for patient).
-/patients/logIn (POST)
    - Behavior: Searches for an account associated with the given email in the database, if an account is found it will compare the given password to the account password hash.
    - Expected parameters: Expects an email and password passed in the body of the POST request.
    - Responses: 401 (patient not found, password does not match), 201 (login success), 400 (error updating patient status, error searching for patient).
- /patients/status (GET)
    - Behavior: Returns the email and last access of the logged-in patient.
    - Expected parameters: Expects an x-auth header containing the current session token.
    - Responses: 401 (missing x-auth header, invalid JWT), 200 (success, patient status JSON), 400 (error accessing database).
- /patients/devices (GET)
    - Behavior: Returns all devices associated with the current user account.
    - Expected parameters: Expects an x-auth header containing the current session token.
    - Responses: 401 (missing x-auth header, invalid JWT), 200 (success, user devices JSON), 400 (error accessing database).
- /patients/addDevice (POST)
    - Behavior: Adds a new device to the list of devices for the current user account
    - Expected parameters: Expects a device object passed in the body of the POST request and an x-auth header containing the current session token.
    - Responses: 400 (invalid or missing device), 401 (missing x-auth header, invalid JWT), 404 (patient not found), 200 (device successfully added), 500 (error adding device, error searching database).
- /patients/updateDevice/:deviceId (POST)
    - Behavior: Updates the name, frequency, startTime, and/or endTime attributes for the device associated with the given device ID in the current user account.
    - Expected parameters: Expects a device ID passed through the URL, the updated name, frequency, startTime, and endTime passed through the body of the POST request, and an x-auth header containing the current session token.
    - Responses: 401 (missing x-auth header, invalid JWT), 404 (patient not found, device not found), 200 (device updated successfully), 500 (failed to update device).
- /patients/deviceInfo/:deviceID (GET)
    - Behavior: Returns the device details for the given device ID in the current user account.
    - Expected parameters: Expects a device ID passed through the URL and an x-auth header containing the current session token.
    - Responses: 401 (missing x-auth header, invalid JWT), 404 (patient not found, device not found), 200 (device details JSON), 500 (error accessing database).
- /patients/deleteDevice/:deviceID (DELETE)
    - Behavior: Deletes the device with the given device ID from the current user account.
    - Expected parameters: Expects a device ID passed through the URL and an x-auth header containing the current session token.
    - Responses: 401 (missing x-auth header, invalid JWT), 404 (patient not found, device not found), 200 (device details JSON), 500 (error accessing database).
- /patients/changePassword (POST)
    - Behavior: Checks that the given old password matches the account password hash, if the passwords match it will then update the password hash for the current user account to match the given new password.
    - Expected parameters: Expects the old and new passwords passed through the body of the POST request and an x-auth header containing the current session token.
    - Responses: 401 (missing x-auth header, user not found, old password does not match), 201 (patient account has been updated), 400 (error updating patient, error searching for patient).
- /readings/addData (POST)
    - Behavior: Validates the given API key and adds heart rate and pulse oxygen data associated with a device id and the current time to the readings database.
    - Expected parameters: Requires a valid API key and expects that a data object (including heart rate and pulse oxygen) and device ID are passed through the body of the POST request.
    - Responses: 401 (missing data), 201 (data added), 400 (error saving data), 403 (invalid API key).
- /readings/getData/:deviceID (GET)
    - Behavior: Returns heart rate and pulse oxygen data for the given device ID.
    - Expected parameters: Expects a device ID passed through the URL and an x-auth header containing the current session token.
    - Responses: 401 (missing x-auth header, invalid JWT), 200 (readings JSON), 400 (error accessing database).
