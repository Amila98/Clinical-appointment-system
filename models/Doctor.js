// models/Doctor.js
const mongoose = require('mongoose');

const DoctorSchema = new mongoose.Schema({
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
    profilePicture: { 
        type: String, default: '' 
    },
    specializations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Specialization'
    }],
    schedules: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Schedule'
    }]
});

const Doctor = mongoose.model('Doctor', DoctorSchema);

module.exports = Doctor;
