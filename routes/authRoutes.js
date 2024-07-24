// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, verify } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const verifyMiddleware = require('../middleware/verifyMiddleware');

// Register route
router.post('/register', register);

// Email verification route
router.get('/verify/:token', verify);


// Example of a protected route
router.get('/protected', authMiddleware, verifyMiddleware, (req, res) => {
  res.status(200).json({ msg: 'This is a protected route' });
});


module.exports = router;
