// models/PendingDoctor.js
const mongoose = require('mongoose');

const pendingDoctorSchema = new mongoose.Schema({
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
        type: String
    },
    isVerified: {
        type: Boolean,
        default: false  
    },
    specializations: [{
        specializationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Specialization',
            required: true
        },
        schedules: [{
            day: {
                type: String,
                required: true
            },
            startTime: {
                type: String,
                required: true
            },
            endTime: {
                type: String,
                required: true
            },
            appointmentTimeLimit: {
                type: Number,
                default: 15, // You can set a default value for appointment time limit
                required: true // Mark it as required if you expect it to always be provided
            },
            slots: [{
                start: {
                    type: String,
                    required: true
                },
                end: {
                    type: String,
                    required: true
                },
                isAvailable: {
                    type: Boolean,
                    default: true
                }
            }]
        }]
    }],
    dateRegistered: {
        type: Date,
        default: Date.now
    }
});

const PendingDoctor = mongoose.model('PendingDoctor', pendingDoctorSchema);
module.exports = PendingDoctor;
