const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StaffSchema = new Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    dateOfBirth: {
        type: Date,
        required: false,
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'male', 'female', 'Other', 'other'], // Customize as needed
        required: false,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phoneNumber: {
        type: String,
        required: false,
    },
    address: {
        type: String,
        required: false,
    },
    emergencyContactName: {
        type: String,
        required: false,
    },
    emergencyContactPhone: {
        type: String,
        required: false,
    },
    password: {
        type: String,
        required: false,
    },
    role: {
        type: String,
        default: 'Staff',
    },
    mustChangePassword: {
        type: Boolean,
        default: false,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    profilePicture: {
        type: String,
        default: '',
    }
});

const Staff = mongoose.model('Staff', StaffSchema);

module.exports = Staff;
