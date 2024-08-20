// models/permission.js
const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['Super Admin', 'Admin', 'Doctor', 'Staff', 'Patient'],
        required: true,
        unique: true,
    },
    permissionLevel: {
        type: Number,
        required: true
    }, 
    permissions: {
        type: [String],  // Array of permissions
        required: true,
    }
    
});

const Permission = mongoose.model('Permission', permissionSchema);

module.exports = Permission;
