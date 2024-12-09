var express = require('express');
var router = express.Router();
var Patient = require("../models/patient");
const jwt = require("jwt-simple");
const bcrypt = require("bcryptjs");
const fs = require('fs');

// On AWS ec2, you can use to store the secret in a separate file. 
// The file should be stored outside of your code directory. 
// For encoding/decoding JWT

const secret = fs.readFileSync(__dirname + '/../keys/jwtkey').toString();

// example of authentication
// register a new patient

// see javascript/signup.js for ajax call
// see Figure 9.3.5: Node.js project uses token-based authentication and password hashing with bcryptjs on zybooks

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
                console.log(msgStr);
            }).catch((err) => {
                res.status(400).json({ success: false, err: err });
            });
        }
    }).catch((err) => {
        res.status(400).json({ success: false, err: err });
    });
});

// see javascript/login.js for ajax call

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

// see javascript/account.js for ajax call

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

router.post("/updatePassword", function (req, res) {
    if (!req.body.currentPassword || !req.body.newPassword) {
        return res.status(400).json({ success: false, msg: "Missing current or new password" });
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

            if (!bcrypt.compareSync(req.body.currentPassword, patient.passwordHash)) {
                return res.status(401).json({ success: false, msg: "Current password is incorrect" });
            }

            const newPasswordHash = bcrypt.hashSync(req.body.newPassword, 10);
            patient.passwordHash = newPasswordHash;

            patient.save().then(() => {
                res.status(200).json({ success: true, msg: "Password updated successfully" });
            }).catch((err) => {
                res.status(500).json({ success: false, msg: "Failed to update password", error: err });
            });
        }).catch((err) => {
            res.status(500).json({ success: false, msg: "Error accessing database", error: err });
        });
    } catch (ex) {
        res.status(401).json({ success: false, msg: "Invalid JWT" });
    }
});

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
            console.log("FOUND PATIENT: " + patient)

            // Add unique deviceIDs to the patient's list
            patient.devices.push(req.body.device);

            console.log("PATIENT: " + patient);

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

router.post("/updateDevice/:deviceId", async function (req, res) {
    const { deviceId } = req.params;
    const { name, frequency } = req.body;

    console.log("NAME: " + name + ", FREQ: " + frequency);

    if (!req.headers["x-auth"]) {
        return res.status(401).json({ success: false, msg: "Missing X-Auth header" });
    }

    const token = req.headers["x-auth"];
    try {
        const decoded = jwt.decode(token, secret);

        const updatedPatient = await Patient.findOneAndUpdate(
            { email: decoded.email, 'devices.id': deviceId },
            {
                $set: {
                    'devices.$.name': name,
                    'devices.$.frequency': frequency,
                },
            },
            { new: true } 
        );

        if (!updatedPatient) {
            return res.status(404).json({ error: 'Patient or device not found' });
        }

        res.status(200).json({ message: 'Device updated successfully', updatedPatient });
    } catch (error) {
        console.error("Error during device update:", error);
        res.status(500).json({ error: 'Failed to update device' });
    }
});


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
})



module.exports = router;