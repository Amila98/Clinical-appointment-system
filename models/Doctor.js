// models/doctor.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const PERMISSION_LEVELS = require('../utils/permissionLevels');

const DoctorSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    professionalInfo: {
        type: String,
        required: true
    },
    schedule: { 
        type: String,
        required: true 
    },
    role: {
        type: String,
        default: 'Doctor',
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    mustChangePassword: {
        type: Boolean,
        default: false
    },
    profilePicture: { type: String, default: '' },
    permissionLevel: { type: Number, default: PERMISSION_LEVELS.DOCTOR }
});

const Doctor = mongoose.model('Doctor', DoctorSchema);

module.exports = Doctor;
