// models/Reminder.js
const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true,
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true,
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    template: {
        type: String,
        default: null, // Optional field to track the message template used
    },
    variables: {
        type: Object,
        default: {}, // Optional field to track the variables used in the message
    },
    sentAt: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['Sent', 'Failed'],
        default: 'Sent',
    },
    error: {
        type: String,
        default: null,
    },
});

module.exports = mongoose.model('Reminder', ReminderSchema);
