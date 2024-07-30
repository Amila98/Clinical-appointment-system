const express = require('express');
const router = express.Router();
const { verify, loginUser } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { registerPatient } = require('../controllers/patientController');


// Patient registration route
router.post('/register/patient', registerPatient);

router.post('/login', loginUser);

// Email verification route
router.get('/verify/:token', verify);

module.exports = router;
