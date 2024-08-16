const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const PERMISSION_LEVELS = require('../utils/permissionLevels');

const StaffSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    contact: {
        type: String,
        required: false, 
    },
    password: {
        type: String,
        required: false,
    },
    role: {
        type: String,
        default: 'staff',
    },
    mustChangePassword: {
        type: Boolean,
        default: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    profilePicture: { type: String, default: '' },
    permissionLevel: { type: Number, default: PERMISSION_LEVELS.STAFF }
});

const Staff = mongoose.model('Staff', StaffSchema);

module.exports = Staff;
