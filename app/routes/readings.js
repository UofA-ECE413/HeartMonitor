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

// example of authentication
// register a new patient

// see javascript/signup.js for ajax call
// see Figure 9.3.5: Node.js project uses token-based authentication and password hashing with bcryptjs on zybooks

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
            // Send back a token that contains the user's username
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