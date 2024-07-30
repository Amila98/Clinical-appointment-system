// routes/doctorRoutes.js
const express = require('express');
const router = express.Router();
const { registerDoctor,loginDoctor, changeDoctorPassword } = require('../controllers/doctorController');
const auth = require('../middleware/authMiddleware'); // Middleware to authenticate the token

router.post('/register', registerDoctor);

// Doctor login route
router.post('/login', loginDoctor);

// Change doctor password route
router.post('/change-password', auth.authMiddleware, changeDoctorPassword);

module.exports = router;
