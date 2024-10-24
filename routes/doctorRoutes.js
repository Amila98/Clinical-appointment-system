// routes/doctorRoutes.js
const express = require('express');
const router = express.Router();
const Invitation  = require('../models/Invitation');
const { registerDoctor, appointmentHistory, treatmentPlan, updateTreatment, createArticle, getMyArticles, updateArticle,  deleteArticle, scheduleFollowUpAppointment, handleDoctorFees } = require('../controllers/doctorController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');
const { uploadImageMiddleware } = require('../middleware/uploadMiddleware');


// Route to validate the token (without sending the email back)
router.get('/register/:token', async (req, res) => {
    const { token } = req.params;

    try {
        const invitation = await Invitation.findOne({ invitationToken: token });

        if (!invitation || invitation.isInvitationUsed) {
            return res.status(400).json({ msg: 'Invalid or expired token.' });
        }

        res.status(200).json({ msg: 'Token is valid. Proceed with registration.' });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

router.post('/register/:token', registerDoctor);

router.get('/appointmentsHistory/:patientId/:appointmentId?', authMiddleware, roleCheck(['view_appointments']), appointmentHistory);

router.post('/treatment-plan/:appointmentId', authMiddleware,treatmentPlan)

router.put('/update-treatment-plan/:appointmentHistoryId', authMiddleware,updateTreatment)

router.post('/create-article',uploadImageMiddleware, authMiddleware, createArticle)

router.get('/my-articles', authMiddleware, getMyArticles)

router.put('/update-article/:articleId',uploadImageMiddleware, authMiddleware, updateArticle)

router.delete('/delete-article/:articleId', authMiddleware, deleteArticle)

router.post('/followup-appointment/:appointmentId', authMiddleware, roleCheck(['followup_appointment']), scheduleFollowUpAppointment)

router.get('/fees/:doctorId', authMiddleware, handleDoctorFees);

// Route to update doctor fees (PUT)
router.put('/fees/:doctorId', authMiddleware, handleDoctorFees);

module.exports = router;
