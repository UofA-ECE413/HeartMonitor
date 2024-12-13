const db = require("../db");

const patientSchema = new db.Schema({
    email:          String,
    passwordHash:   String,
    lastAccess:     { type: Date, default: Date.now },
    devices:      [{
        name: String,
        id: String,
        frequency: Number,
        startTime: String,
        endTime: String,
    }],
});

const Patient = new db.model("Patient", patientSchema); 

module.exports = Patient;