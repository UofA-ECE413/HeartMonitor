var express = require('express');
var router = express.Router();
var Reading = require("../models/reading");
const jwt = require("jwt-simple");
const bcrypt = require("bcryptjs");
const fs = require('fs');


const secret = fs.readFileSync(__dirname + '/../keys/jwtkey').toString();

// Generate a random API Key
const API_KEY = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
console.log(`Generated API Key: ${API_KEY}`); // Print the generated API Key on server startup

// Behavior: Validates the given API key and adds heart rate and pulse oxygen data associated with a device id and the current time to the readings database.
// Expected parameters: Requires a valid API key and expects that a data object (including heart rate and pulse oxygen) and device ID are passed through the body of the POST request.
// Responses: 401 (missing data), 201 (data added), 400 (error saving data), 403 (invalid API key).
router.post('/addData', function (req, res) {
    const { API_Key } = req.body; // Extract only the API_Key from the request body

    // Check if API Key is valid
    const isValidApiKey = API_Key === API_KEY;

    // Log the request body and validation result
    console.log('Received JSON:', JSON.stringify(req.body, null, 4));
    console.log('Validation Result:', isValidApiKey ? 'Success' : 'Failure');

    // Respond with the original JSON and validation result
    if (isValidApiKey) {
        let data = JSON.parse(req.body.data);
        if (!data.heartRate || !data.spo2) {
            res.status(401).json({ error: "Missing data" });
            return;
        }
        const newReading = new Reading ({
            time: new Date(),
            heartRate: data.heartRate,
            spo2: data.spo2,
            deviceID: req.body.coreid
        });
        console.log(newReading);
        newReading.save().then((reading) => {
            console.log("SUCCESS");
            res.status(201).json({ success: true, msg: "Data added" });
        }).catch((err) => {
            res.status(400).json({ success: false, err: err });
        });
    } else {
        res.status(403).json({
            message: 'Failure: Invalid API Key',
            received: req.body, // Echo back the full received JSON
        });
    }
});

// Behavior: Returns heart rate and pulse oxygen data for the given device ID.
// Expected parameters: Expects a device ID passed through the URL and an x-auth header containing the current session token.
// Responses: 401 (missing x-auth header, invalid JWT), 200 (readings JSON), 400 (error accessing database).
router.get('/getData/:deviceID', function (req, res) {
    // See if the X-Auth header is set
    if (!req.headers["x-auth"]) {
        return res.status(401).json({ success: false, msg: "Missing X-Auth header" });
    }
    // X-Auth should contain the token 
    const token = req.headers["x-auth"]; 
    try {
        const decoded = jwt.decode(token, secret);
        console.log(req.params);
        Reading.find({deviceID: req.params.deviceID}).then((readings) => {
            res.status(200).json(readings);
        }).catch((err) => {
            res.status(400).json({ success: false, message: "Error contacting DB. Please contact support." });
        });
    }
    catch (ex) {
        console.log(ex.message);
        res.status(401).json({ success: false, message: "Invalid JWT" });
    }
});


module.exports = router;