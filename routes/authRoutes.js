const express = require('express');
const router = express.Router();
const { uploadProfilePicture, changePassword, viewProfilePicture, deleteProfilePicture } = require('../controllers/authController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');
const { uploadImageMiddleware, uploadMedicalFileMiddleware } = require('../middleware/uploadMiddleware');
const { uploadMedicalFile, viewMedicalFile, deleteMedicalFile }  = require('../controllers/authController');



// Forgot password route
router.post('/change-password', changePassword);

// Route to upload profile picture
router.post('/profile-picture', authMiddleware,uploadImageMiddleware, uploadProfilePicture);
router.get('/profile-picture', authMiddleware, viewProfilePicture);
router.delete('/profile-picture', authMiddleware, deleteProfilePicture);

router.post('/medical-file', authMiddleware, uploadMedicalFileMiddleware, uploadMedicalFile);
router.get('/medical-file/:patientId', authMiddleware, viewMedicalFile);
router.delete('/medical-file/:fileIndex', authMiddleware, deleteMedicalFile);


module.exports = router;
