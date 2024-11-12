const mongoose = require('mongoose');

const AppointmentHistorySchema = new mongoose.Schema({
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    specialization: { type: mongoose.Schema.Types.ObjectId, ref: 'Specialization', required: true },
    day: { type: String, required: true },
    treatmentPlan: {
        type: String,  // Stores the treatment plan entered by the doctor
        required: true,
    },
    prescription: {
        date: {
            type: Date,
            required: false,
        },
        medicines: [{
            type: String,
        }]
    },
    status: { type: String, enum: ['Completed'], default: 'Completed' },  // Set status to 'Completed'
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AppointmentHistory', AppointmentHistorySchema);
