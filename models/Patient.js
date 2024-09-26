const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PatientSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  dob: {
    type: Date,
    required: true,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  zipCode: {
    type: String,
    required: true,
  },
  medicalHistory: {
    type: String,
    required: false,
  },
  currentMedications: {
    type: String,
    required: false,
  },
  allergies: {
    type: String,
    required: false,
  },
  emergencyContactName: {
    type: String,
    required: true,
  },
  emergencyContactPhone: {
    type: String,
    required: true,
  },
  emergencyAddress: {
    type: String,
    required: true,
  },
  emergencyRelationship: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: 'Patient',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
     type: String 
    },
  mustChangePassword: { 
    type: Boolean, 
    default: false
  },
  profilePicture: { 
    data: Buffer,
    contentType: String
  },
  medicalFiles: [
    {
      fileName: String,
      contentType: String,
      data: Buffer,
      uploadDate: { type: Date, default: Date.now }
    }
  ]
});

// Method to compare hashed passwords
PatientSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Patient', PatientSchema);
