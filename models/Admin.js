const mongoose = require('mongoose');
const PERMISSION_LEVELS = require('../utils/permissionLevels');

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
        type: String 
    },
    permissionLevel: { 
        type: Number, 
        default: PERMISSION_LEVELS.SUPER_ADMIN, 
        required: true 
    },
    // Optional: additional permissions array for custom admin permissions
    permissions: {
        type: [String],
        default: []
    }
});

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
