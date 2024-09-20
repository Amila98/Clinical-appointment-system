// routes/doctorRoutes.js
const express = require('express');
const router = express.Router();
const Invitation  = require('../models/Invitation');
const { registerDoctor} = require('../controllers/doctorController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');


// Route to validate the token (without sending the email back)
router.get('/register/:token', async (req, res) => {
    const { token } = req.params;

    try {
        const invitation = await Invitation.findOne({ invitationToken: token });

        if (!invitation || invitation.isInvitationUsed) {
            return res.status(400).json({ msg: 'Invalid or expired token.' });
        }

        res.status(200).json({ msg: 'Token is valid. Proceed with registration.' });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});


router.post('/register/:token', registerDoctor);

module.exports = router;
