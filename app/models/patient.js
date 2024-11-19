const db = require("../db");

const patientSchema = new db.Schema({
    email:          String,
    passwordHash:   String,
    lastAccess:     { type: Date, default: Date.now },
    deviceIDs:      [String],
});

const Patient = new db.model("Patient", patientSchema); 

module.exports = Patient;