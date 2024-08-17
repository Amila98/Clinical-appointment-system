// routes/doctorRoutes.js
const express = require('express');
const router = express.Router();
const { uploadMiddleware } = require('../middleware/uploadMiddleware');
const { registerDoctor,loginDoctor, changeDoctorPassword, viewDoctorDetails, updateDoctorDetails } = require('../controllers/doctorController');
const auth = require('../middleware/authMiddleware'); // Middleware to authenticate the token

router.post('/register/:token',auth.authMiddleware, registerDoctor);

// Doctor login route
router.post('/login', loginDoctor);

// Change doctor password route
router.post('/change-password', auth.authMiddleware, changeDoctorPassword);

router.get('/details', auth.authMiddleware, viewDoctorDetails);
router.put('/edit-details', auth.authMiddleware,uploadMiddleware, updateDoctorDetails);

module.exports = router;
