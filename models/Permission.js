// models/permission.js
const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['Super Admin', 'Admin', 'Doctor', 'Staff', 'Patient'],
        required: true,
        unique: true,
    },

    permissions: {
        type: Map,  // Store permissions as a Map of key-value pairs
        of: Boolean,  // The values are boolean
        required: true,
    }
    
});

const Permission = mongoose.model('Permission', permissionSchema);

module.exports = Permission;
