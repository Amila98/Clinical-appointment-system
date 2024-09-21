// models/Appointment.js
const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',  // Reference to the Doctor model
        required: true,
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',  // Reference to the Patient model if you have one
    },

    specialization: { type: mongoose.Schema.Types.ObjectId, ref: 'Specialization', required: true },

    schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },

    day: {
        type: String,
        required: true,
    },
    timeSlot: {
        start: { type: String, required: true },  // e.g., '09:00'
        end: { type: String, required: true }     // e.g., '09:30'
    },

    
    status: { 
        type: String, 
        enum: ['Scheduled', 'Completed', 'Cancelled'], 
        default: 'Scheduled' 
    },
    created_at: { type: Date, default: Date.now },

});

module.exports = mongoose.model('Appointment', AppointmentSchema);
