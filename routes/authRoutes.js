const express = require('express');
const router = express.Router();
const { forgotPassword, resetPassword, uploadProfilePicture } = require('../controllers/authController');
const { authMiddleware, verifyMiddleware } = require('../middleware/authMiddleware');
const { uploadMiddleware } = require('../middleware/uploadMiddleware');


// Forgot password route
router.post('/forgot-password', forgotPassword);

// Reset password route
router.post('/reset-password/:token', resetPassword);

// Route to upload profile picture
router.post('/upload-profile-picture', authMiddleware, verifyMiddleware,uploadMiddleware, uploadProfilePicture);


module.exports = router;
