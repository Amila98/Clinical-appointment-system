const express = require('express');
const Specialization = require('../models/Specialization');
const Staff = require('../models/Staff');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const { uploadImageMiddleware } = require('../middleware/uploadMiddleware');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');
const { loginUser,viewUserDetails,updatePersonalDetails, createUser, getUserById, updateUser, deleteUser, changeOwnPassword,
    getDoctorsBySpecialization,getAvailableDaysForDoctor, getPatients, getAvailableSlotsForDoctor, placeAppointment, manageSchedules, 
    manageBreaks,updateAppointment, deleteAppointment,getAppointments } = require('../controllers/userController');

const router = express.Router();

router.post('/login', loginUser);

router.get('/view-user', authMiddleware, viewUserDetails);

router.put('/update-personaldetails', authMiddleware, uploadImageMiddleware, updatePersonalDetails);

router.post('/change-ownpassword', authMiddleware, roleCheck(['change_own_password']), changeOwnPassword);

// Create user route
router.post('/create-user', authMiddleware, roleCheck(['create_user']), createUser);

// Get user by ID route
router.get('/get-user/:id', authMiddleware, roleCheck(['read_user']), getUserById);

// Update user by ID route
router.put('/update-user/:role/:id', authMiddleware, roleCheck(['update_user']), updateUser);

// Delete user by ID route
router.delete('/delete-user/:role/:id', authMiddleware, roleCheck(['delete_user']), deleteUser);

router.get('/doctors-by-specialization', authMiddleware,roleCheck(['view_doctors_by_specialization']), getDoctorsBySpecialization);

router.get('/available-slots-doctor', authMiddleware, roleCheck(['view_doctor_slots']), getAvailableSlotsForDoctor);

router.get('/available-days-doctor', authMiddleware, roleCheck(['view_doctor_available_days']), getAvailableDaysForDoctor);

router.post('/place-appointment',authMiddleware, roleCheck(['place_appointment']), placeAppointment);

router.put('/update-appointment',authMiddleware, updateAppointment);

router.get('/appointments',authMiddleware, getAppointments);

router.delete('/delete-appointment/:appointmentId',authMiddleware, deleteAppointment);

// Route to get all specializations
router.get('/all-specializations', async (req, res) => {
    try {
        const specializations = await Specialization.find();
        res.status(200).json(specializations);
    } catch (error) {
        console.error('Error fetching specializations:', error); // Log the detailed error
        res.status(500).json({ msg: 'Error fetching specializations', error: error.message }); // Provide detailed error in response
    }
});

router.get('/all-patients', authMiddleware, roleCheck(['view_patients']), getPatients);

// Route to get all staff members
router.get('/all-staff',authMiddleware,roleCheck(['view_staff']), async (req, res) => {
    try {
        const staff = await Staff.find();
        res.status(200).json(staff);
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ msg: 'Error fetching staff', error: error.message });
    }
});

// Route to get all doctors
router.get('/all-doctors',authMiddleware,roleCheck(['view_doctors']), async (req, res) => {
    try {
        const doctors = await Doctor.find();
        res.status(200).json(doctors);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ msg: 'Error fetching doctors', error: error.message });
    }
});

router.route('/schedules')
    .all(authMiddleware)
    .post(authMiddleware,manageSchedules)   // Create a new schedule
    .get(authMiddleware,manageSchedules)    // Get schedules
    .put(authMiddleware,manageSchedules)    // Update a schedule
    .delete(authMiddleware,manageSchedules); // Delete a schedule


// Define routes for breaks
router.route('/breaks')
    .all(authMiddleware) // Apply the auth middleware to all methods
    .post(authMiddleware, manageBreaks)   // Create a new break
    .get(authMiddleware, manageBreaks)    // Get breaks
    .put(authMiddleware, manageBreaks)    // Update a break
    .delete(authMiddleware, manageBreaks); // Delete a break    

router.get('/all-appointments', authMiddleware,roleCheck(['view_appointments']), async (req, res) => {
    try {
        const appointments = await Appointment.find();
        res.status(200).json(appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ msg: 'Error fetching appointments', error: error.message });
    }
});



module.exports = router;
