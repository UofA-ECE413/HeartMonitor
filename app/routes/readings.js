var express = require('express');
var router = express.Router();
var Reading = require("../models/reading");

// example of authentication
// register a new patient

// see javascript/signup.js for ajax call
// see Figure 9.3.5: Node.js project uses token-based authentication and password hashing with bcryptjs on zybooks

router.post('/addData', function (req, res) {
    let data = JSON.parse(req.body.data);
    console.log(req.body);
    console.log("data: " + data);
    if (!data.ir || !data.heartRate || !data.spo2) {
        res.status(401).json({ error: "Missing data" });
        return;
    }
    const newReading = {
        ir: data.ir,
        heartRate: data.heartRate,
        spo2: data.spo2,
        deviceID: req.body.coreid
    };
    newReading.save().then((reading) => {
        // Send back a token that contains the user's username
        res.status(201).json({ success: true, msg: "Data added" });
    }).catch((err) => {
        res.status(400).json({ success: false, err: err });
    });
});

router.get("/getData", function (req, res) {
    try {
        // Send back email and last access
        Reading.find({}).then((user) => {
            res.status(200).json({email: user.email, lastAccess: user.lastAccess});
        }).catch((err) => {
            res.status(400).json({ success: false, message: "Error contacting DB. Please contact support." });
        });
    }
    catch (ex) {
        res.status(401).json({ success: false, message: "Invalid JWT" });
    }
});

module.exports = router;