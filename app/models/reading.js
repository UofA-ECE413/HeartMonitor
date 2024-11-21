const db = require("../db");

const readingSchema = new db.Schema({
    time: {type: String, default: new Date()},
    heartRate: String,
    spo2: String,
    deviceID: String,
 });

const Reading = new db.model("Reading", readingSchema); 

module.exports = Reading;