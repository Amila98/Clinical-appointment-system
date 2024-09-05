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
            }
        }]
    }],
    dateRegistered: {
        type: Date,
        default: Date.now
    }
});

const PendingDoctor = mongoose.model('PendingDoctor', pendingDoctorSchema);
module.exports = PendingDoctor;
