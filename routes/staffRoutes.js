const express = require('express');
const router = express.Router();
const { verifyStaff, loginStaff, changePassword, viewStaffDetails, updateStaffDetails } = require('../controllers/staffController');
const auth = require('../middleware/authMiddleware');

// Route to verify staff
router.get('/verify/:token', verifyStaff);
router.post('/login', loginStaff);
router.post('/change-password', changePassword);
router.put('/edit-details', auth.authMiddleware, updateStaffDetails);
router.get('/details', auth.authMiddleware, viewStaffDetails);

module.exports = router;
