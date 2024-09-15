// models/Invitation.js
const mongoose = require('mongoose');

const InvitationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    invitationToken: {
        type: String,
        required: true,
    },
    isInvitationUsed: {
        type: Boolean,
        default: false,
    },
    expiresAt: {
        type: Date,
        required: false,
    }
});


// Automatically set expiration date (24 hours from now)
InvitationSchema.pre('save', function (next) {
    if (!this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    }
    next();
});

const Invitation = mongoose.model('Invitation', InvitationSchema);

module.exports = Invitation;
