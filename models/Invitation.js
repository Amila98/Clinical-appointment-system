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
});

const Invitation = mongoose.model('Invitation', InvitationSchema);

module.exports = Invitation;
