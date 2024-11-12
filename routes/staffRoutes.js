const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const { verifyStaff, sendReminders } = require('../controllers/staffController');
const { authMiddleware,roleCheck } = require('../middleware/authMiddleware'); // Middleware to authenticate the token




// Handle the verification and password setting (React will handle the UI)
router.get('/verify/:token', (req, res) => {
    const { token } = req.params;

    try {
        // Decode the token to ensure it's valid
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // If token is valid, respond with a success message or status code
        res.status(200).json({ msg: 'Token is valid', token });
    } catch (err) {
        // If token is invalid or expired, respond with an error
        res.status(400).json({ msg: 'Invalid or expired token' });
    }
});

// Route to verify staff
router.post('/verify/:token', verifyStaff);

router.post('/send-reminders', authMiddleware, sendReminders);



module.exports = router;
