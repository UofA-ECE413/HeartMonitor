const db = require("../db");

/*
Defines a mongoose schema and model for managing the sensor reading data that is posted to 
the cloud. The readingSchema includes fields for the timestamp, heart rate, SpO2, and the 
associated device ID.This schema is used to represent all readings that apply to a specific 
patient in the database. The model is also exported for use throughout the project.
*/
const readingSchema = new db.Schema({
    time: {type: String, default: new Date()},
    heartRate: String,
    spo2: String,
    deviceID: String,
 });

const Reading = new db.model("Reading", readingSchema); 

module.exports = Reading;