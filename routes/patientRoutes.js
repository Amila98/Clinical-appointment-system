// routes/patientRoutes.js
const express = require('express');
const router = express.Router();
const { registerPatient } = require('../controllers/patientController');
const { loginUser } = require('../controllers/authController');
const { requestPasswordReset, resetPassword}  =  require('../controllers/patientController');

//
router.post('/register', registerPatient);

// Patient login route (using generic login function)
router.post('/login', loginUser);

router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password/:token', resetPassword);


module.exports = router;
