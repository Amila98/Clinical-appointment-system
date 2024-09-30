const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    mustChangePassword: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: true
    },
    role: {
        type: String,
        enum: ['Super Admin', 'Admin'], // Restrict roles to admin-specific options
        required: true
    },
    profilePicture: { 
        data: Buffer,
        contentType: String
    },
});

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
