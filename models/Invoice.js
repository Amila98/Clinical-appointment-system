const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  patientId: {  
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient', // Updated to reference the Patient schema
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null // Initially null, will be updated after appointment is placed
  },
  amountPaid: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Partial'], // Added 'Partial' status
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    enum: ['Card', 'Cash'], // Payment method
    required: true
  },
  feeType: {
    type: String,
    enum: ['Advance', 'Full'], // Advance or Full payment
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
