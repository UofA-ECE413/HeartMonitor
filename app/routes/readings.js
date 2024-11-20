var express = require('express');
var router = express.Router();
var Reading = require("../models/reading");

// example of authentication
// register a new patient

// see javascript/signup.js for ajax call
// see Figure 9.3.5: Node.js project uses token-based authentication and password hashing with bcryptjs on zybooks

router.post('/addData', function (req, res) {
    console.log(req.body);
    if (!req.body.ir || !req.body.heartRate || !req.body.spo2) {
        res.status(401).json({ error: "Missing data" });
        return;
    }
    const newReading = {
        ir: req.body.ir,
        heartRate: req.body.heartRate,
        spo2: req.body.spo2
    };
    newReading.save().then((reading) => {
        // Send back a token that contains the user's username
        res.status(201).json({ success: true, msg: "Data added" });
    }).catch((err) => {
        res.status(400).json({ success: false, err: err });
    });
});