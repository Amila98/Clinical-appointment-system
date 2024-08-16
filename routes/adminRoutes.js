// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { uploadMiddleware } = require('../middleware/uploadMiddleware');
const { loginAdmin, changeAdminPassword, createStaffMember,sendDoctorInvitation, verifyDoctor, viewAdminDetails, updateAdminDetails, changeUserEmail } = require('../controllers/adminController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');
const { ADMIN,SUPER_ADMIN, DOCTOR, STAFF, PATIENT } = require('../utils/permissionLevels');




// Admin login route
router.post('/login', loginAdmin);

// Change admin password route
router.post('/change-password', authMiddleware, roleCheck(['change_admin_password']), changeAdminPassword);
// Invite doctor route
router.post('/invite-doctor', authMiddleware, roleCheck(['invite_doctor']), sendDoctorInvitation);

// Verify doctor route
router.post('/verify-doctor', authMiddleware, roleCheck(['verify_doctor']), verifyDoctor);

// Create staff member route
router.post('/create-staff', authMiddleware, roleCheck(['create_staff']), createStaffMember);

// Change user email route
router.put('/change-email/:userId', authMiddleware, roleCheck(['change_user_email']), changeUserEmail);


router.get('/view-admindetails', authMiddleware, roleCheck(ADMIN), viewAdminDetails);

router.put('/update-admindetails', authMiddleware, roleCheck(ADMIN), uploadMiddleware, updateAdminDetails);


router.get('/dashboard',authMiddleware, roleCheck(ADMIN), (req, res) => {
    res.json({ msg: 'Welcome to Admin Dashboard' });
});



module.exports = router;



