// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const PendingDoctor  = require('../models/PendingDoctor');
const { createStaffMember,sendDoctorInvitation, verifyDoctor, changeUserEmail, manageSpecializations } = require('../controllers/adminController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');


// Route to get a list of pending doctors
router.get('/pending-doctors', async (req, res) => {
  try {
      const pendingDoctors = await PendingDoctor.find({}); // Fetch all pending doctors
      res.status(200).json(pendingDoctors);
  } catch (error) {
      res.status(500).json({ msg: 'Server error', error: error.message });
  }
});

// Invite doctor route
router.post('/invite-doctor', authMiddleware, roleCheck(['invite_doctor']), sendDoctorInvitation);

// Verify doctor route
router.post('/verify-doctor', authMiddleware, roleCheck(['verify_doctor']), verifyDoctor);

// Create staff member route
router.post('/create-staff', authMiddleware, roleCheck(['create_staff']), createStaffMember);

// Change user email route
router.put('/change-email/:userId', authMiddleware, roleCheck(['change_user_email']), changeUserEmail);


// Single endpoint to manage all CRUD operations on specializations
router.route('/specializations/:id')
    .all(authMiddleware)
    .delete(roleCheck(['delete_specialization']), manageSpecializations)
    .put(roleCheck(['update_specialization']), manageSpecializations); 


router.route('/specializations')
    .all(authMiddleware)
    .post(roleCheck(['create_specialization']), manageSpecializations) // Create
    .get(roleCheck(['read_specialization']), manageSpecializations)
    



module.exports = router;



