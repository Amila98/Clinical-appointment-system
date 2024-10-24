// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const PendingDoctor  = require('../models/PendingDoctor');
const { createStaffMember,sendDoctorInvitation, verifyDoctor, changeUserEmail, manageSpecializations,managePermissions, createOrUpdateSettings, getSettings, uploadApplicationLogo, uploadFavicon } = require('../controllers/adminController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');
const { uploadImageMiddleware } = require('../middleware/uploadMiddleware');


// Route to get a list of pending doctors or a specific doctor by id
router.get('/pending-doctors', async (req, res) => {
    try {
        const { id } = req.query;  // Get the id from query parameters
  
        if (id) {
            // If id is provided, fetch the specific doctor by id
            const doctor = await PendingDoctor.findById(id);
            if (!doctor) {
                return res.status(404).json({ msg: 'Doctor not found' });
            }
            res.status(200).json(doctor);
        } else {
            // If no id is provided, fetch all pending doctors
            const pendingDoctors = await PendingDoctor.find({});
            res.status(200).json(pendingDoctors);
        }
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



router.post('/settings',authMiddleware, createOrUpdateSettings); // Create or Update Settings
router.get('/settings',authMiddleware, getSettings);             // Retrieve Settings
router.post('/settings/logo',authMiddleware, uploadImageMiddleware, uploadApplicationLogo); // Upload logo
router.post('/settings/favicon',authMiddleware, uploadImageMiddleware, uploadFavicon); // Upload favicon   


// For all operations, use the same controller with appropriate method
router.post('/permissions/:role', authMiddleware, roleCheck(['assignPermissions']), managePermissions); // Create
router.get('/permissions/:role?', authMiddleware, roleCheck(['viewPermissions']), managePermissions); // Read by role
router.put('/permissions/:role', authMiddleware, roleCheck(['updatePermissions']), managePermissions); // Update
router.delete('/permissions/:role', authMiddleware, roleCheck(['deletePermissions']), managePermissions); // Delete



module.exports = router;



