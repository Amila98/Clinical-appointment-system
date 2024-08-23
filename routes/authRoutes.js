const express = require('express');
const router = express.Router();
const { uploadProfilePicture, changePassword } = require('../controllers/authController');
const { authMiddleware, verifyMiddleware, roleCheck } = require('../middleware/authMiddleware');
const { uploadImageMiddleware } = require('../middleware/uploadMiddleware');


// Forgot password route
router.post('/change-password', changePassword);

// Route to upload profile picture
router.post('/upload-profile-picture', authMiddleware, verifyMiddleware,uploadImageMiddleware,roleCheck(['upload-profile-picture']), uploadProfilePicture);


module.exports = router;
