const db = require("../db");

/*
Defines a mongoose schema and model for managing patient data in the MongoDB database. 
The patientSchema includes fields for storing the patient's email, hashed-password, last access 
date, and an array of devices the user may register with. Each device has an ID, frequency of 
measurement, start and end times, all of which the user can define. Lastly, the Patient model 
is exported for use in other parts of the application. 
*/
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