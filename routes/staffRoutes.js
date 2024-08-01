const express = require('express');
const router = express.Router();
const { verifyStaff, loginStaff, changePassword, viewStaffDetails, updateStaffDetails } = require('../controllers/staffController');
const auth = require('../middleware/authMiddleware');

// Route to verify staff
router.get('/verify/:token', verifyStaff);
router.post('/login', loginStaff);
router.post('/change-password', changePassword);
router.get('/details', auth.authMiddleware, viewStaffDetails);
router.put('/edit-details', auth.authMiddleware, updateStaffDetails);


module.exports = router;
