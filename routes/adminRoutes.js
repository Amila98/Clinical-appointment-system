// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { loginAdmin, changeAdminPassword, createStaffMember,sendDoctorInvitation, verifyDoctor } = require('../controllers/adminController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');

// Admin login route
router.post('/login', loginAdmin);

// Change admin password route
router.post('/change-password', [authMiddleware, roleCheck('admin')], changeAdminPassword);

// Endpoint to send doctor invitation
router.post('/invite-doctor', authMiddleware, roleCheck('admin'), sendDoctorInvitation);

router.post('/verify-doctor', verifyDoctor);

router.post('/create-staff', authMiddleware, createStaffMember);



module.exports = router;



