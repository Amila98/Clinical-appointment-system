const express = require('express');
const router = express.Router();
const  {registerPatient, verify, loginUser, requestPasswordReset, resetPassword, viewPatientDetails, updatePatientDetails }= require('../controllers/patientController');
const {authMiddleware} = require('../middleware/authMiddleware'); // Middleware to verify JWT token

// Patient registration route
router.post('/register', registerPatient);

// Email verification route
router.get('/verify/:token', verify);

// Login route
router.post('/login', loginUser);

// Request password reset route
router.post('/request-password-reset', requestPasswordReset);

// Reset password route
router.post('/reset-password/:token', resetPassword);

// View patient personal information (protected route)
router.get('/details', authMiddleware, viewPatientDetails);

// Update patient personal information (protected route)
router.put('/details', authMiddleware, updatePatientDetails);

module.exports = router;
