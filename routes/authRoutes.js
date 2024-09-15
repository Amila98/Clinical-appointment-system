const express = require('express');
const router = express.Router();
const { uploadProfilePicture, changePassword } = require('../controllers/authController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');
const { uploadImageMiddleware } = require('../middleware/uploadMiddleware');


// Forgot password route
router.post('/change-password', changePassword);

// Route to upload profile picture
router.post('/upload-profile-picture', authMiddleware,uploadImageMiddleware, roleCheck(['upload_profile_picture']), uploadProfilePicture);


module.exports = router;
