const express = require('express');
const router = express.Router();
const { uploadImageMiddleware,uploadMedicalFileMiddleware } = require('../middleware/uploadMiddleware');
const  {registerPatient, verify, requestPasswordReset, resetPassword, updatePatientDetails }= require('../controllers/patientController');
const {authMiddleware,roleCheck} = require('../middleware/authMiddleware'); // Middleware to verify JWT token

// Patient registration route
router.post('/register',uploadMedicalFileMiddleware, registerPatient);

// Email verification route
router.get('/verify/:token', verify);

// Request password reset route
router.post('/request-password-reset', requestPasswordReset);

// Reset password route
router.post('/reset-password/:token', resetPassword);

module.exports = router;
