const express = require('express');
const router = express.Router();
const { verify, } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { registerPatient } = require('../controllers/patientController');
const { loginUser } = require('../controllers/authController');


// Patient registration route
router.post('/register/patient', registerPatient);

router.post('/login', loginUser);

// Email verification route
router.get('/verify/:token', verify);

module.exports = router;
