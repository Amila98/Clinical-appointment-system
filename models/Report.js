const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    specialization: { type: mongoose.Schema.Types.ObjectId, ref: 'Specialization', required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Cancelled'], required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
});

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;
