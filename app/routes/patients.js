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

// please fiil in the blanks
// see javascript/signup.js for ajax call
// see Figure 9.3.5: Node.js project uses token-based authentication and password hashing with bcryptjs on zybooks

router.post('/signUp', function (req, res) {
    Patient.findOne({ email: req.body.email }).then( function (err, patient) {
        if (err) res.status(401).json({ success: false, err: err });
        else if (patient) {
            res.status(401).json({ success: false, msg: "This email already used" });
        }
        else {
            const passwordHash = bcrypt.hashSync(req.body.password, 10); 
            const newPatient = new Patient({
                email: req.body.email,
                passwordHash: passwordHash  
            });
            newPatient.save().then(function (err, patient) { 
                if (err) {
                    res.status(400).json({ success: false, err: err });
                }
                else {
                   let msgStr = `Patient (${req.body.email}) account has been created.`;
                   res.status(201).json({ success: true, message: msgStr });
                   console.log(msgStr);
                }
            });
        }
    });
});

// please fill in the blanks
// see javascript/login.js for ajax call
// see Figure 9.3.5: Node.js project uses token-based authentication and password hashing with bcryptjs on zybooks

router.post("/logIn", function (req, res) {//added code on this line DORIAN
   if (!req.body.email || !req.body.password) {
       res.status(401).json({ error: "Missing email and/or password" });
       return;
   }
   // Get user from the database
   Patient.findOne({email: req.body.email}, function (err, patient) {//added code on this line DORIAN
       if (err) {
           res.status(400).send(err);
       }
       else if (!patient) {//added code on this line DORIAN
           // Username not in the database
           res.status(401).json({ error: "Login failure!!" });
       }
       else {
           if (bcrypt.compareSync(req.body.password, patient.passwordHash)) { //added code on this line DORIAN
               const token = jwt.encode({ username: patient.username }, secret);//added code on this line DORIAN
               //update user's last access time
               patient.lastAccess = new Date();
               patient.save((err, patient) => {
                   console.log("User's LastAccess has been update.");
               });
               // Send back a token that contains the user's username
               res.status(201).json({ success: true, token: token, msg: "Login success" });
           }
           else {
               res.status(401).json({ success: false, msg: "Email or password invalid." });
           }
       }
   });
});

// please fiil in the blanks
// see javascript/account.js for ajax call
// see Figure 9.3.5: Node.js project uses token-based authentication and password hashing with bcryptjs on zybooks

router.get("/status", function (req, res) { // ADDED AIDAN
   // See if the X-Auth header is set
   if (!req.headers["x-auth"]) {
       return res.status(401).json({ success: false, msg: "Missing X-Auth header" });
   }
   // X-Auth should contain the token 
   const token = req.headers["x-auth"]; // ADDED
   try {
       const decoded = jwt.decode(token, secret); // ADDED
       // Send back email and last access
       Patient.find({}, "email lastAccess", function (err, users) { //ADDED
           if (err) {
               res.status(400).json({ success: false, message: "Error contacting DB. Please contact support." });
           }
           else {
               res.status(200).json(users);
           }
       });
   }
   catch (ex) {
       res.status(401).json({ success: false, message: "Invalid JWT" });
   }
});

module.exports = router;