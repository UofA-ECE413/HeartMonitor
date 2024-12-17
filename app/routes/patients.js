var express = require('express');
var router = express.Router();
var Patient = require("../models/patient");
const jwt = require("jwt-simple");
const bcrypt = require("bcryptjs");
const fs = require('fs');

const secret = fs.readFileSync(__dirname + '/../keys/jwtkey').toString();

// Behavior: Checks if an account already exists under the given email. If the account exists then an error message will be returned, otherwise the account is created using the email and the (hashed) password.
// Expected parameters: Expects an email and password passed in the body of the POST request.
// Responses: 401 (email already exists), 201 (patient account has been created), 400 (error creating patient, error searching for patient).
router.post('/signUp', function (req, res) {
    Patient.findOne({ email: req.body.email }).then( function (patient) {
        if (patient) {
            res.status(401).json({ success: false, msg: "This email already used" });
        }
        else {
            const passwordHash = bcrypt.hashSync(req.body.password, 10); 
            const newPatient = new Patient({
                email: req.body.email,
                passwordHash: passwordHash  
            });
            newPatient.save().then(function (patient) { 
                let msgStr = `Patient (${req.body.email}) account has been created.`;
                res.status(201).json({ success: true, message: msgStr });
            }).catch((err) => {
                res.status(400).json({ success: false, err: err });
            });
        }
    }).catch((err) => {
        res.status(400).json({ success: false, err: err });
    });
});

// Behavior: Searches for an account associated with the given email in the database, if an account is found it will compare the given password to the account password hash.
// Expected parameters: Expects an email and password passed in the body of the POST request.
// Responses: 401 (patient not found, password does not match), 201 (login success), 400 (error updating patient status, error searching for patient).
router.post("/logIn", function (req, res) {
    if (!req.body.email || !req.body.password) {
        res.status(401).json({ error: "Missing email and/or password" });
        return;
    }
    // Get user from the database
    Patient.findOne({email: req.body.email}).then(function (patient) {
        if (!patient) {
            // Username not in the database
            res.status(401).json({ error: "Login Failed" });
        }
        else {
            if (bcrypt.compareSync(req.body.password, patient.passwordHash)) { 
                const token = jwt.encode({ email: patient.email }, secret);
                //update user's last access time
                patient.lastAccess = new Date();
                patient.save().then((patient) => {
                    // Send back a token that contains the user's username
                    res.status(201).json({ success: true, token: token, msg: "Login success" });
                }).catch((err) => {
                    res.status(400).json({ success: false, err: err });
                });
            }
            else {
                res.status(401).json({ success: false, msg: "Email or password invalid." });
            }
        }
    }).catch((err) => {
        res.status(400).send(err);
    });
});

// Behavior: Returns the email and last access of the logged-in patient.
// Expected parameters: Expects an x-auth header containing the current session token.
// Responses: 401 (missing x-auth header, invalid JWT), 200 (success, patient status JSON), 400 (error accessing database).
router.get("/status", function (req, res) { 
    // See if the X-Auth header is set
    if (!req.headers["x-auth"]) {
        return res.status(401).json({ success: false, msg: "Missing X-Auth header" });
    }
    // X-Auth should contain the token 
    const token = req.headers["x-auth"]; 
    try {
        const decoded = jwt.decode(token, secret);
        // Send back email and last access
        Patient.findOne({ email: decoded.email }).then((user) => {
            res.status(200).json({email: user.email, lastAccess: user.lastAccess});
        }).catch((err) => {
            res.status(400).json({ success: false, message: "Error contacting DB. Please contact support." });
        });
    }
    catch (ex) {
        res.status(401).json({ success: false, message: "Invalid JWT" });
    }
});

// Behavior: Returns all devices associated with the current user account.
// Expected parameters: Expects an x-auth header containing the current session token.
// Responses: 401 (missing x-auth header, invalid JWT), 200 (success, user devices JSON), 400 (error accessing database).
router.get("/devices", function (req, res) { 
    // See if the X-Auth header is set
    if (!req.headers["x-auth"]) {
        return res.status(401).json({ success: false, msg: "Missing X-Auth header" });
    }
    // X-Auth should contain the token 
    const token = req.headers["x-auth"]; 
    try {
        const decoded = jwt.decode(token, secret);
        // Send back email and last access
        Patient.findOne({ email: decoded.email }).then((user) => {
            res.status(200).json({devices: user.devices});
        }).catch((err) => {
            res.status(400).json({ success: false, message: "Error contacting DB. Please contact support." });
        });
    }
    catch (ex) {
        res.status(401).json({ success: false, message: "Invalid JWT" });
    }
});

// Behavior: Adds a new device to the list of devices for the current user account
// Expected parameters: Expects a device object passed in the body of the POST request and an x-auth header containing the current session token.
// Responses: 400 (invalid or missing device), 401 (missing x-auth header, invalid JWT), 404 (patient not found), 200 (device successfully added), 500 (error adding device, error searching database).
router.post("/addDevice", function (req, res) {
    if (!req.body.device) {
        return res.status(400).json({ success: false, msg: "Invalid or missing device" });
    }

    if (!req.headers["x-auth"]) {
        return res.status(401).json({ success: false, msg: "Missing X-Auth header" });
    }

    const token = req.headers["x-auth"];
    try {
        const decoded = jwt.decode(token, secret);

        Patient.findOne({ email: decoded.email }).then(function (patient) {
            if (!patient) {
                return res.status(404).json({ success: false, msg: "Patient not found" });
            }

            // Add unique deviceIDs to the patient's list
            var devices = new Set(patient.devices);
            devices.add(req.body.device);
            patient.devices = Array.from(devices);

            patient.save().then(() => {
                res.status(200).json({ success: true, msg: "Devices added successfully", devices: patient.devices });
            }).catch((err) => {
                res.status(500).json({ success: false, msg: "Failed to add devices", error: err });
            });
        }).catch((err) => {
            res.status(500).json({ success: false, msg: "Error accessing database", error: err });
        });
    } catch (ex) {
        res.status(401).json({ success: false, msg: "Invalid JWT" });
    }
});


// Behavior: Updates the name, frequency, startTime, and/or endTime attributes for the device associated with the given device ID in the current user account.
// Expected parameters: Expects a device ID passed through the URL, the updated name, frequency, startTime, and endTime passed through the body of the POST request, and an x-auth header containing the current session token.
// Responses: 401 (missing x-auth header, invalid JWT), 404 (patient not found, device not found), 200 (device updated successfully), 500 (failed to update device).
router.post("/updateDevice/:deviceId", async function (req, res) {
    var { deviceId } = req.params;
    var { name, frequency, startTime, endTime } = req.body;

    if (!req.headers["x-auth"]) {
        return res.status(401).json({ success: false, msg: "Missing X-Auth header" });
    }

    const token = req.headers["x-auth"];
    try {
        const decoded = jwt.decode(token, secret);

        Patient.findOne({ email: decoded.email }).then(function (patient) {
            if (!patient) {
                return res.status(404).json({ success: false, msg: "Patient not found" });
            }
            
            const deviceIndex = patient.devices.findIndex((d) => d.id === deviceId.toString());
            if (deviceIndex === -1) {
                return res.status(404).json({ success: false, msg: "Device not found" });
            }

            patient.devices[deviceIndex] = {
                    id: deviceId,
                    name: name,
                    frequency: frequency,
                    startTime: startTime,
                    endTime: endTime,
            }

            patient.save()

            res.status(200).json({ message: 'Device updated successfully', patient});
        });
    } catch (error) {
        console.error("Error during device update:", error);
        res.status(500).json({ error: 'Failed to update device' });
    }
});


// Behavior: Returns the device details for the given device ID in the current user account.
// Expected parameters: Expects a device ID passed through the URL and an x-auth header containing the current session token.
// Responses: 401 (missing x-auth header, invalid JWT), 404 (patient not found, device not found), 200 (device details JSON), 500 (error accessing database).
router.get("/deviceInfo/:deviceID", function (req, res) {
    const { deviceID } = req.params;

    if (!req.headers["x-auth"]) {
        return res.status(401).json({ success: false, msg: "Missing X-Auth header" });
    }

    const token = req.headers["x-auth"];
    try {
        const decoded = jwt.decode(token, secret);
        Patient.findOne({ email: decoded.email }).then(function (patient) {
            if (!patient) {
                return res.status(404).json({ success: false, msg: "Patient not found" });
            }
            
            const device = patient.devices.find((d) => d.id === deviceID.toString());
            if (!device) {
                return res.status(404).json({ error: 'Device not found' });
            }

            res.status(200).json({ device });
        }).catch((err) => {
            res.status(500).json({ success: false, msg: "Error accessing database", error: err });
        });
    } catch (ex) {
        res.status(401).json({ success: false, msg: "Invalid JWT" });
    }
})

// Behavior: Deletes the device with the given device ID from the current user account.
// Expected parameters: Expects a device ID passed through the URL and an x-auth header containing the current session token.
// Responses: 401 (missing x-auth header, invalid JWT), 404 (patient not found, device not found), 200 (device details JSON), 500 (error accessing database).
router.delete("/deleteDevice/:deviceID", function (req, res) {
    const { deviceID } = req.params;

    if (!req.headers["x-auth"]) {
        return res.status(401).json({ success: false, msg: "Missing X-Auth header" });
    }

    const token = req.headers["x-auth"];
    try {
        const decoded = jwt.decode(token, secret);
        Patient.findOne({ email: decoded.email }).then(function (patient) {
            if (!patient) {
                return res.status(404).json({ success: false, msg: "Patient not found" });
            }
            // Find and remove the device
            const deviceIndex = patient.devices.findIndex((d) => d.id === deviceID.toString());
            if (deviceIndex === -1) {
                return res.status(404).json({ success: false, msg: "Device not found" });
            }

            patient.devices.splice(deviceIndex, 1); // Remove the device from the array

            // Save the updated patient document
            patient.save().then(() => {
                res.status(200).json({ success: true, msg: "Device deleted successfully" });
            }).catch((err) => {
                res.status(500).json({ success: false, msg: "Error saving changes", error: err });
            });
        }).catch((err) => {
            res.status(500).json({ success: false, msg: "Error accessing database", error: err });
        });
    } catch (ex) {
        res.status(401).json({ success: false, msg: "Invalid JWT" });
    }
});

// Behavior: Checks that the given old password matches the account password hash, if the passwords match it will then update the password hash for the current user account to match the given new password.
// Expected parameters: Expects the old and new passwords passed through the body of the POST request and an x-auth header containing the current session token.
// Responses: 401 (missing x-auth header, user not found, old password does not match), 201 (patient account has been updated), 400 (error updating patient, error searching for patient).
router.post("/changePassword", function (req, res) {
    const oldPass = req.body.oldPassword;
    const newPass = req.body.newPassword;

    if (!req.headers["x-auth"]) {
        return res.status(401).json({ success: false, msg: "Missing X-Auth header" });
    }

    const token = req.headers["x-auth"];

    try {
        const decoded = jwt.decode(token, secret);
        
        // Get user from the database
        Patient.findOne({email: decoded.email}).then(function (patient) {
            if (!patient) {
                // Username not in the database
                res.status(401).json({ message: "User Not Found" });
            }
            else {
                if (bcrypt.compareSync(oldPass, patient.passwordHash)) { 
                    patient.passwordHash = bcrypt.hashSync(newPass, 10);
                    patient.save().then((patient) => {
                        // Send back a token that contains the user's username
                        res.status(201).json({ success: true, token: token, message: "Password successfully changed" });
                    }).catch((err) => {
                        res.status(400).json({ success: false, message: err });
                    });
                }
                else {
                    res.status(401).json({ message: "Old Password invalid" });
                }
            }
        }).catch((err) => {
            res.status(400).send(err);
        });

    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ message: 'Failed to update password' });
    }
});



module.exports = router;