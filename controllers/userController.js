const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { encryptToken } = require('../utils/cryptoUtils');
const { decryptToken } = require('../utils/cryptoUtils');
const Admin = require('../models/Admin');
const Staff = require('../models/Staff');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Permission = require('../models/Permission');
const Appointment = require('../models/Appointment'); 
const Break = require('../models/Break');
const Invoice = require('../models/Invoice');
const Report = require('../models/Report');
const  processCardPayment   = require('../utils/processCardPayment');
const { Parser } = require('json2csv');
const { v4: uuidv4 } = require('uuid');



// Function to get the model based on the user's role
const getUserModel = async (userId) => {
    const admin = await Admin.findById(userId);
    if (admin) return Admin;

    const doctor = await Doctor.findById(userId);
    if (doctor) return Doctor;

    const staff = await Staff.findById(userId);
    if (staff) return Staff;

    const patient = await Patient.findById(userId);
    if (patient) return Patient;

    return null;  // If no role matches
};


/*
// Helper function to generate an access token (short-lived)
const generateAccessToken = (user) => {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' }); // Access token expires in 15 minutes
};

// Helper function to generate a refresh token (long-lived)
const generateRefreshToken = (user) => {
    return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' }); // Refresh token expires in 7 days
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user across all roles by email
        const user = await Admin.findOne({ email }) ||
                     await Doctor.findOne({ email }) ||
                     await Patient.findOne({ email }) ||
                     await Staff.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Check if the user is verified (only for non-admin roles)
        if (!(user instanceof Admin) && !user.isVerified) {
            return res.status(403).json({ msg: 'Account not verified. Please complete the verification process.' });
        }

        // Compare the provided password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Determine the user role for the token
        const role = user.role;

        // If the user must change their password (and is not a patient)
        if (user.mustChangePassword && role !== 'Patient') {
            const accessToken = generateAccessToken({ userId: user._id, role });
            const refreshToken = generateRefreshToken({ userId: user._id, role });

            // Encrypt the refresh token before storing
            const encryptedRefreshToken = encryptToken(refreshToken);
            user.refreshToken = encryptedRefreshToken; // Store the encrypted refresh token
            await user.save();

            return res.status(200).json({
                msg: 'Password change required',
                mustChangePassword: true,
                accessToken,
                refreshToken
            });
        }

        // Fetch permissions for the user
        const permissionDoc = await Permission.findOne({ role: user.role });

        if (!permissionDoc) {
            return res.status(403).json({ msg: 'Access denied: role permissions not found' });
        }

        const permissions = permissionDoc.permissions || {};

        // Generate access and refresh tokens
        const accessToken = generateAccessToken({ userId: user._id, role, isVerified: user.isVerified, permissions });
        const refreshToken = generateRefreshToken({ userId: user._id, role });

        // Encrypt the refresh token before storing
        const encryptedRefreshToken = encryptToken(refreshToken);
        user.refreshToken = encryptedRefreshToken; // Store the encrypted refresh token
        await user.save();

        // Encrypt the access token before sending (if necessary)
        const encryptedAccessToken = encryptToken(accessToken);

        // Send both tokens to the client
        return res.status(200).json({
            msg: 'Login successful',
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken
        });

    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};


const refreshToken = async (req, res) => {
    const { token } = req.body; // Get the refresh token from the request body

    if (!token) {
        return res.status(401).json({ msg: 'Refresh token is required' });
    }

    try {
        // Decrypt the refresh token
        const decryptedToken = decryptToken(token);

        // Verify the refresh token
        jwt.verify(decryptedToken, process.env.JWT_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({ msg: 'Invalid refresh token' });
            }

            // Find the user by userId in the database
            const foundUser = await Admin.findById(user.userId) ||
                              await Doctor.findById(user.userId) ||
                              await Patient.findById(user.userId) ||
                              await Staff.findById(user.userId);

            if (!foundUser || foundUser.refreshToken !== token) {
                return res.status(403).json({ msg: 'Refresh token is invalid or does not match' });
            }

            // Generate new access token
            const newAccessToken = generateAccessToken({ userId: user.userId, role: user.role });

            // Optionally generate a new refresh token and store it
            const newRefreshToken = generateRefreshToken({ userId: user.userId, role: user.role });
            const encryptedNewRefreshToken = encryptToken(newRefreshToken);

            // Store the new encrypted refresh token
            foundUser.refreshToken = encryptedNewRefreshToken; 
            await foundUser.save();

            return res.status(200).json({
                accessToken: encryptToken(newAccessToken), // Send the new access token encrypted
                refreshToken: encryptedNewRefreshToken // Send the new encrypted refresh token
            });
        });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


const logoutUser = async (req, res) => {
    const { token } = req.body; // Get the refresh token from the request body

    if (!token) {
        return res.status(400).json({ msg: 'Refresh token is required' });
    }

    try {
        // Verify the refresh token without decrypting
        jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({ msg: 'Invalid refresh token' });
            }

            // Find the user and clear their refresh token
            const foundUser = await Admin.findById(user.userId) ||
                              await Doctor.findById(user.userId) ||
                              await Patient.findById(user.userId) ||
                              await Staff.findById(user.userId);

            if (!foundUser) {
                return res.status(404).json({ msg: 'User not found' });
            }

            foundUser.refreshToken = null; // Clear the refresh token
            await foundUser.save();

            return res.status(200).json({ msg: 'Logged out successfully' });
        });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

*/


const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user across all roles by email
        const user = await Admin.findOne({ email }) ||
                     await Doctor.findOne({ email }) ||
                     await Patient.findOne({ email }) ||
                     await Staff.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Check if the user is verified (only for non-admin roles)
        if (!(user instanceof Admin) && !user.isVerified) {
            return res.status(403).json({ msg: 'Account not verified. Please complete the verification process.' });
        }

        // Compare the provided password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Determine the user role for the token
        const role = user.role;

        // If the user must change their password (and is not a patient)
        if (user.mustChangePassword && role !== 'Patient') {
            const token = jwt.sign({ userId: user._id, role }, process.env.JWT_SECRET, { expiresIn: '1d' });
            const encryptedToken = encryptToken(token); // Encrypt the token
            return res.status(200).json({ msg: 'Password change required', mustChangePassword: true, token: encryptedToken });
        }

        // Fetch permissions directly as an object with boolean values
        const permissionDoc = await Permission.findOne({ role: user.role });

        if (!permissionDoc) {
        return res.status(403).json({ msg: 'Access denied: role permissions not found' });
        }

        // Extract permissions from the document
        const permissions = permissionDoc.permissions || {};

        // Generate the token with permissions included
        const token = jwt.sign({ userId: user._id, role, isVerified: user.isVerified, permissions: permissions }, process.env.JWT_SECRET, { expiresIn: '1d' });
        const encryptedToken = encryptToken(token); // Encrypt the token

        // Return token (you don't need to return permissions separately)
        return res.status(200).json({ msg: 'Login successful', token: encryptedToken});

    } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
    }
};



const viewUserDetails = async (req, res) => {
    // Get the user ID from the request user object (token)
    const userId = req.user.userId;

    try {
        // Determine the model based on the user's ID
        const UserModel = await getUserModel(userId);
        if (!UserModel) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Find the user by ID and exclude the password field
        const user = await UserModel.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Return the user details
        res.status(200).json(user);
    } catch (err) {
        if (err.message === 'User not found') {
            res.status(404).json({ msg: 'User not found' });
        } else {
            res.status(500).json({ msg: 'Server error', error: err.message });
        }
    }
};


const updatePersonalDetails = async (req, res) => {
    try {
        // Get userId from middleware-populated req.user
        const userId = req.user.userId;

        // Get appropriate model based on user ID
        const UserModel = await getUserModel(userId);
        if (!UserModel) {
            return res.status(404).json({ msg: 'User model not found' });
        }

        // Find the user by ID
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Check for password update fields without hardcoding other fields
        const { currentPassword, newPassword } = req.body;
        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Current password is incorrect' });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        // Update all fields dynamically from req.body, excluding password fields
        Object.entries(req.body).forEach(([key, value]) => {
            if (key !== 'currentPassword' && key !== 'newPassword' && value !== undefined) {
                user[key] = value;
            }
        });

        // Update profile picture if a new one is uploaded
        if (req.file) {
            user.profilePicture = req.file.path;
        }

        // Save the updated user details
        await user.save();

        res.status(200).json({ msg: 'User details updated successfully', user });
    } catch (error) {
        console.error('Error updating user details:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({ msg: 'User not found' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ msg: 'Invalid input' });
        }
        return res.status(500).json({ msg: 'Error updating user details' });
    }
};



const createUser = async (req, res) => {
    try {
        const { username, password, email, role, name, schedule, professionalInfo } = req.body;

        const requesterRole = req.user.role;

        if (!username || !password || !email || !role) {
            return res.status(400).json({ msg: 'Missing required fields' });
        }

        if (role === 'Super Admin') {
            return res.status(403).json({ msg: 'Cannot create Super Admin through this route' });
        }

        if (role === 'Admin' && requesterRole !== 'Super Admin') {
            return res.status(403).json({ msg: 'Only Super Admins can create Admins' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let user;

        if (role === 'Admin') {
            user = new Admin({
                username,
                password: hashedPassword,
                email,
                role,
                mustChangePassword: true,
                isVerified: true
                // Ensure 'specializations' is not included here or is handled properly
            });
        } else if (role === 'Staff') {
            if (!name) {
                return res.status(400).json({ msg: 'Missing required fields: name is required for Staff' });
            }

            user = new Staff({
                name,
                username,
                password: hashedPassword,
                email,
                role,
                mustChangePassword: true,
                isVerified: false
            });
        } else if (role === 'Doctor') {
            if (!name || !schedule || !professionalInfo) {
                return res.status(400).json({ msg: 'Missing required fields: name, schedule, and professionalInfo are required for Doctor' });
            }

            user = new Doctor({
                name,
                username,
                password: hashedPassword,
                email,
                role,
                schedule,
                professionalInfo,
                mustChangePassword: true,
                isVerified: false
            });
        } else {
            return res.status(400).json({ msg: 'Invalid role' });
        }

        await user.save();
        res.status(201).json({ msg: `${role} created successfully` });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


const getUserById = async (req, res) => {
    try {
        const { id } = req.params; // Only extract id from the request parameters
        let user;

        // Attempt to find the user in each model
        user = await Admin.findById(id) || 
               await Staff.findById(id) ||
               await Patient.findById(id) || 
               await Doctor.findById(id);

        // Return error response if user is not found
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Return user document as JSON response
        res.status(200).json(user);
    } catch (error) {
        // Log and return error response if an error occurs
        console.error('Error getting user:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


const updateUser = async (req, res) => {
    try {
        // Destructure role and id from request parameters
        const { role, id } = req.params;
        // Destructure updates from request body
        const updates = req.body;
        let user;

        // Find user document from respective model based on role
        if (role === 'Admin') {
            user = await Admin.findById(id);
        } else if (role === 'Staff') {
            user = await Staff.findById(id);
        } else if (role === 'Doctor') {
            user = await Doctor.findById(id);
        } else {
            // Return error response if role is invalid
            return res.status(400).json({ msg: 'Invalid role' });
        }

        // Return error response if user is not found
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Update user fields from updates
        Object.keys(updates).forEach(key => {
            if (user[key] !== undefined) {
                user[key] = updates[key];
            }
        });

        // Save the updated user document
        await user.save();

        // Return success response with updated user document
        res.status(200).json({ msg: `${role} updated successfully`, user });
    } catch (error) {
        // Log and return error response if an error occurs
        console.error('Error updating user:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


const deleteUser = async (req, res) => {
    try {
        // Destructure role and id from request parameters
        const { role, id } = req.params;
        let result;

        // Find user document from respective model based on role and delete it
        if (role === 'Admin') {
            result = await Admin.findByIdAndDelete(id);
        } else if (role === 'Staff') {
            result = await Staff.findByIdAndDelete(id);
        } else if (role === 'Doctor') {
            result = await Doctor.findByIdAndDelete(id);
        } else {
            // Return error response if role is invalid
            return res.status(400).json({ msg: 'Invalid role' });
        }

        // Return error response if user is not found
        if (!result) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Return success response with the deleted user's role
        res.status(200).json({ msg: `${role} deleted successfully` });
    } catch (error) {
        // Log and return error response if an error occurs
        console.error('Error deleting user:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

const changeOwnPassword = async (req, res) => {
    const { newPassword } = req.body;
    const userId = req.user.userId;

    try {
        const userModel = await getUserModel(userId);

        if (!userModel) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await userModel.findByIdAndUpdate(userId, { password: hashedPassword, mustChangePassword: false });

        res.status(200).json({ msg: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};


const getDoctorsBySpecialization = async (req, res) => {
    const { specialization_id } = req.query;

    try {
        // Fetch doctors based on the specialization
        const doctors = await Doctor.find({
            'specializations.specializationId': specialization_id
        }).populate('specializations.specializationId', 'name description');

        if (!doctors.length) {
            return res.status(404).json({ msg: 'No doctors found for the given specialization' });
        }

        // Process each doctor to include their schedules
        const doctorsWithSchedules = doctors.map(doctor => {
            // Find the specialization
            const specialization = doctor.specializations.find(spec => 
                spec.specializationId.equals(specialization_id)
            );
            return {
                doctor: {
                    _id: doctor._id,
                    name: doctor.name,
                    email: doctor.email,
                    professionalInfo: doctor.professionalInfo
                },
            };
        });

        res.status(200).json(doctorsWithSchedules);
    } catch (error) {
        console.error('Error fetching doctors by specialization:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};



const getAvailableSlotsForDoctor = async (req, res) => {
    const { doctor_id, day } = req.query;

    try {
        const { userId, role } = req.user;

        let doctorIdToFetch;

        // If the role is Doctor, use their ID; otherwise, use the provided doctor_id
        if (role === 'Doctor') {
            doctorIdToFetch = userId;
        } else if (role === 'Admin' && doctor_id) {
            doctorIdToFetch = doctor_id;
        } else {
            return res.status(400).json({ msg: 'Doctor ID is required for Admins.' });
        }

        // Fetch the doctor's details
        const doctor = await Doctor.findById(doctorIdToFetch)
            .populate('specializations.specializationId', 'name description');

        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        // Fetch breaks for the day
        const breaks = await Break.find({ doctor: doctorIdToFetch, day });

        // Helper function to check if a slot is affected by breaks
        const isSlotDuringBreak = (slotStart, slotEnd) => {
            return breaks.some(brk => {
                const breakStart = new Date(`1970-01-01T${brk.startTime}:00Z`);
                const breakEnd = new Date(`1970-01-01T${brk.endTime}:00Z`);
                return slotStart < breakEnd && slotEnd > breakStart;
            });
        };

        const availableSchedules = [];

        // Iterate through each specialization
        for (const specialization of doctor.specializations) {
            const schedulesForDay = specialization.schedules.filter(schedule => schedule.day === day);

            for (const schedule of schedulesForDay) {
                const updatedSlots = [];

                // Iterate over each slot in the schedule
                for (const slot of schedule.slots) {
                    // Parse the slot's start and end times
                    const slotStart = new Date(`1970-01-01T${slot.start}:00Z`);
                    const slotEnd = new Date(`1970-01-01T${slot.end}:00Z`);

                    // Check if the slot is during a break
                    const hasBreak = isSlotDuringBreak(slotStart, slotEnd);

                    // Push the slot with its availability status
                    updatedSlots.push({
                        id: slot._id, // Assuming slot has an _id field
                        start: slot.start,
                        end: slot.end,
                        isAvailable: slot.isAvailable && !hasBreak // Check both conditions
                    });
                }

                // Include schedules regardless of available slots
                availableSchedules.push({
                    scheduleId: schedule._id,
                    slots: updatedSlots,
                });
            }
        }
        // Return the available schedules with all slots
        return res.status(200).json({ availableSchedules });

    } catch (error) {
        console.error('Error fetching available slots for doctor:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


const getAvailableDaysForDoctor = async (req, res) => {
    const { doctor_id, specialization_id } = req.query;

    try {
        const { userId, role } = req.user;

        let doctorIdToFetch;

        // If the role is Doctor, use their ID; otherwise, use the provided doctor_id
        if (role === 'Doctor') {
            doctorIdToFetch = userId;
        } else if (role === 'Admin' && doctor_id) {
            doctorIdToFetch = doctor_id;
        } else {
            return res.status(400).json({ msg: 'Doctor ID is required for Admins.' });
        }

        // Fetch the doctor's details
        const doctor = await Doctor.findById(doctorIdToFetch)
            .populate('specializations.specializationId', 'name description');

        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        // Find the correct specialization by specialization_id
        const specialization = doctor.specializations.find(spec =>
            spec.specializationId.equals(specialization_id)
        );

        if (!specialization) {
            return res.status(400).json({ msg: 'Doctor does not have the required specialization' });
        }

        // Fetch breaks for the doctor (for all days)
        const breaks = await Break.find({ doctor: doctorIdToFetch });

        // Helper function to check if a slot is during a break
        const isSlotDuringBreak = (slotStart, slotEnd, day) => {
            return breaks.some(brk => {
                if (brk.day !== day) return false;
                const breakStart = new Date(`1970-01-01T${brk.startTime}:00Z`);
                const breakEnd = new Date(`1970-01-01T${brk.endTime}:00Z`);
                return slotStart < breakEnd && slotEnd > breakStart;
            });
        };

        // Set to hold available days
        let availableDays = new Set();

        // Iterate over each schedule in the specialization
        specialization.schedules.forEach(schedule => {
            const { day, slots } = schedule;

            // Filter slots that are available and not during breaks
            const availableSlots = slots.filter(slot => {
                const slotStart = new Date(`1970-01-01T${slot.start}:00Z`);
                const slotEnd = new Date(`1970-01-01T${slot.end}:00Z`);
                return slot.isAvailable && !isSlotDuringBreak(slotStart, slotEnd, day);
            });

            // If there are available slots, add the day to the Set
            if (availableSlots.length > 0) {
                availableDays.add(day);
            }
        });

        // Convert the Set to an array to return only unique available days
        const availableDaysArray = Array.from(availableDays);

        // If no available days are found, return an empty array with a message
        if (availableDaysArray.length === 0) {
            return res.status(200).json({
                msg: 'No available days found for the selected doctor',
                availableDays: []
            });
        }

        // Return only the available days
        res.status(200).json({ availableDays: availableDaysArray });

    } catch (error) {
        console.error('Error fetching available days for doctor:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


    

const getPatients = async (req, res) => {
    try {
        // Fetch all patients from the database
        const patient = await Patient.find();

        // Check if patients exist
        if (!patient.length) {
            return res.status(404).json({ msg: 'No patients found' });
        }

        // Return the list of patients in JSON format
        res.status(200).json(patient);
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

const placeAppointment = async (req, res) => {
    const { specialization_id, day, schedule_id, selectedSlot, patient_id } = req.body;
    
    const userRole = req.user.role; // Get user role from the token
    const doctorId = req.user.userId; // Get logged-in doctor ID from token

    try {
        let doctorId;
        let patient_id;

        if (userRole === 'Doctor') {
            doctorId = userId; // Use the logged-in doctor's ID
            if (!patient_id) {
                return res.status(400).json({ msg: 'Patient ID is required for Doctor' });
            }
        } else if (userRole === 'Admin') {
            doctorId = req.body.doctor_id;
            if (!doctorId) {
                return res.status(400).json({ msg: 'Doctor ID is required for Admin' });
            }
            patient_id = req.body.patient_id;
            if (!patient_id) {
                return res.status(400).json({ msg: 'Patient ID is required for Admin' });
            }
        } else {
            return res.status(403).json({ msg: 'Only Admin and Doctors can place appointments.' });
        }

        const specializationId = new mongoose.Types.ObjectId(specialization_id);
        const scheduleId = new mongoose.Types.ObjectId(schedule_id);
        const slotId = selectedSlot.id;

        // Step 1: Verify if the patient has a valid payment
        const invoice = await Invoice.findOne({
            patientId: patient_id,
            doctorId: doctorId,
            appointmentId: null,
            paymentStatus: ['Completed', 'Partial'], 
        }).sort({ createdAt: -1 });

        if (!invoice) {
            return res.status(400).json({ msg: 'Payment required before placing an appointment' });
        }

        // Step 2: Find the doctor based on the doctorId
        const doctor = await Doctor.findById(doctorId).populate('specializations.specializationId', 'name description');
        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        const specialization = doctor.specializations.find(spec => spec.specializationId.equals(specializationId));
        if (!specialization) {
            return res.status(400).json({ msg: 'Doctor does not have the required specialization' });
        }

        const schedule = specialization.schedules.find(sch => sch._id.equals(scheduleId) && sch.day === day);
        if (!schedule) {
            return res.status(400).json({ msg: 'Invalid schedule ID or doctor does not work on the selected day.' });
        }

        const slot = schedule.slots.find(slot => slot._id.toString() === slotId.toString());
        if (!slot || !slot.isAvailable) {
            return res.status(400).json({ msg: 'Selected slot is no longer available.' });
        }

        // Step 3: Fetch existing appointments that overlap with the selected slot
        const overlappingAppointments = await Appointment.find({
            doctor: doctorId,
            day,
            schedule: scheduleId,
            $and: [
                { 'timeSlot.end': { $gt: slot.start } },
                { 'timeSlot.start': { $lt: slot.end } }
            ]
        });

        const overlappingBreaks = await Break.find({
            doctor: doctorId,
            day,
            $and: [
                { endTime: { $gt: slot.start } },
                { startTime: { $lt: slot.end } }
            ]
        });

        if (overlappingAppointments.length > 0 || overlappingBreaks.length > 0) {
            return res.status(400).json({ msg: 'Selected slot is no longer available due to overlapping appointment or break.' });
        }

        // Step 4: Create the new appointment with slotId
        const newAppointment = new Appointment({
            doctor: doctorId,
            patient: patient_id,
            day,
            timeSlot: { id: slotId, start: slot.start, end: slot.end },
            specialization: specializationId,
            schedule: scheduleId,
            paymentStatus: invoice.paymentStatus // Save the payment status from the invoice
        });

        await newAppointment.save();

        // Step 5: Update the slot's availability
        const updateResult = await Doctor.updateOne(
            { _id: doctorId, 'specializations.schedules._id': scheduleId },
            { 
                $set: { 'specializations.$.schedules.$[elem].slots.$[slot].isAvailable': false }
            },
            {
                arrayFilters: [
                    { 'elem._id': scheduleId },
                    { 'slot._id': slotId }
                ]
            }
        );

        if (updateResult.modifiedCount === 0) {
            return res.status(400).json({ msg: 'Failed to update slot availability.' });
        }

        // Step 6: Update the invoice with appointmentId
        await Invoice.findOneAndUpdate(
            { _id: invoice._id },
            { appointmentId: newAppointment._id }
        );

        res.status(201).json({ msg: 'Appointment placed successfully', appointment: newAppointment });

    } catch (error) {
        console.error('Error placing appointment:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};



const updateAppointment = async (req, res) => {
    const { appointmentId, schedule_id, selectedSlot, day, doctorId } = req.body; // Added doctorId
    const userId = req.user.userId; // Use req.user._id instead of req.user.userId
    const userRole = req.user.role;

    console.log('User ID:', userId, 'User Role:', userRole);

    if (!selectedSlot || !selectedSlot.id) {
        return res.status(400).json({ msg: 'Invalid slot data. Please provide valid slot information.' });
    }

    try {
        // Find the appointment
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ msg: 'Appointment not found' });
        }

        console.log('Appointment:', appointment);

        const previousSlotId = appointment.timeSlot.id;
        const previousScheduleId = appointment.schedule;
        const slotId = selectedSlot.id;
        const scheduleId = new mongoose.Types.ObjectId(schedule_id);

        // If the user is a doctor, ensure they can only update their own appointments
        if (userRole === 'Doctor') {
            if (appointment.doctor.toString() !== userId.toString()) {
                return res.status(403).json({ msg: 'Doctors can only update their own appointments.' });
            }
        }

        // Fetch the doctor based on the role
        const doctor = userRole === 'Admin' && doctorId
            ? await Doctor.findById(doctorId).populate('specializations.specializationId', 'name description')
            : await Doctor.findById(appointment.doctor).populate('specializations.specializationId', 'name description');
        
        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        console.log('Doctor:', doctor);

        // Find the schedule based on the provided schedule_id and day (if given)
        const schedule = doctor.specializations
            .flatMap(spec => spec.schedules)
            .find(sch => sch._id.equals(scheduleId) && (!day || sch.day === day));

        if (!schedule) {
            return res.status(400).json({ msg: `Invalid schedule ID or doctor does not work on the selected day (${day}).` });
        }

        // Find the new slot and check if it's available
        const newSlot = schedule.slots.find(slot => slot._id.toString() === slotId.toString());
        if (!newSlot || !newSlot.isAvailable) {
            return res.status(400).json({ msg: 'Selected slot is no longer available.' });
        }

        // Check for overlapping appointments or breaks
        const overlappingAppointments = await Appointment.find({
            doctor: doctor._id,
            schedule: scheduleId,
            $and: [
                { 'timeSlot.end': { $gt: newSlot.start } },
                { 'timeSlot.start': { $lt: newSlot.end } }
            ]
        });

        const overlappingBreaks = await Break.find({
            doctor: doctor._id,
            day: schedule.day,
            $and: [
                { endTime: { $gt: newSlot.start } },
                { startTime: { $lt: newSlot.end } }
            ]
        });

        const hasOverlap = overlappingAppointments.length > 0 || overlappingBreaks.length > 0;
        if (hasOverlap) {
            return res.status(400).json({ msg: 'Selected slot is no longer available due to overlapping appointment or break.' });
        }

        // Update appointment details
        appointment.doctor = doctor._id; // Allow changing doctor
        appointment.schedule = scheduleId;
        appointment.timeSlot = { id: slotId, start: newSlot.start, end: newSlot.end };
        appointment.day = schedule.day;

        // Save the appointment
        await appointment.save();

        // Update the slot availability
        await Doctor.updateOne(
            { _id: doctor._id, 'specializations.schedules._id': scheduleId },
            { $set: { 'specializations.$.schedules.$[elem].slots.$[slot].isAvailable': false } },
            { arrayFilters: [{ 'elem._id': scheduleId }, { 'slot._id': slotId }] }
        );

        // Restore the availability of the previous slot
        await Doctor.updateOne(
            { _id: doctor._id, 'specializations.schedules._id': previousScheduleId },
            { $set: { 'specializations.$.schedules.$[elem].slots.$[slot].isAvailable': true } },
            { arrayFilters: [{ 'elem._id': previousScheduleId }, { 'slot._id': previousSlotId }] }
        );

        return res.status(200).json({ msg: 'Appointment updated successfully', appointment });

    } catch (error) {
        console.error('Error updating appointment:', error);
        return res.status(500).json({ msg: 'Server error', error: error.message });
    }
};



const getAppointments = async (req, res) => {
    const userId = req.user.userId;  // Get user ID from the token
    const userRole = req.user.role;  // Get user role from the token
    const { doctorId, patientId, day, appointmentId } = req.query;  // Get query parameters

    try {
        let query = {};

        // If the user is a Doctor
        if (userRole === 'Doctor') {
            query.doctor = userId;  // Doctor can only see their own appointments

            // Optional patient filter
            if (patientId) {
                if (!mongoose.Types.ObjectId.isValid(patientId)) {
                    return res.status(400).json({ message: 'Invalid patient ID.' });
                }
                query.patient = patientId;  // Doctor can filter by patient if provided
            }
        }
        // If the user is an Admin
        else if (userRole === 'Admin') {
            if (doctorId) {
                if (!mongoose.Types.ObjectId.isValid(doctorId)) {
                    return res.status(400).json({ message: 'Invalid doctor ID.' });
                }
                query.doctor = doctorId;  // Admin can specify doctor
            }

            // Optional patient filter
            if (patientId) {
                if (!mongoose.Types.ObjectId.isValid(patientId)) {
                    return res.status(400).json({ message: 'Invalid patient ID.' });
                }
                query.patient = patientId;  // Admin can filter by patient if provided
            }
        } else {
            return res.status(403).json({ message: 'Only doctors and admins can view appointments.' });
        }

        // Optional: Filter by appointmentId from params if provided
        if (appointmentId) {
            if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
                return res.status(400).json({ message: 'Invalid appointment ID.' });
            }
            query._id = appointmentId;  // Use appointment ID for a specific appointment
        }

        // Optional: Filter by day if provided
        if (day) {
            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            if (daysOfWeek.includes(day)) {
                query.day = day;  // Filter by the specified day
            } else {
                return res.status(400).json({ message: 'Invalid day provided. Please use a valid day of the week.' });
            }
        }

        // Fetch appointments based on the query
        const appointments = await Appointment.find(query)
            .populate('doctor', 'name')  // Populate doctor details (only name)
            .populate('patient')  // Populate the entire patient object
            .populate('specialization', 'name')  // Populate specialization details (only name)
            .select('day timeSlot status')  // Select the required fields
            .sort({ day: 1, 'timeSlot.start': 1 });  // Sort by day and start time

        // Check if appointments exist
        if (!appointments.length) {
            return res.status(404).json({ message: 'No appointments found.' });
        }

        // Return appointments with fully populated patient details
        res.status(200).json(appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};



const deleteAppointment = async (req, res) => {
    const { appointmentId } = req.params; // Appointment ID from request parameters
    const userId = req.user.userId; // Get user ID from the token
    const userRole = req.user.role; // Get user role from the token

    try {
        // Find the appointment to delete
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ msg: 'Appointment not found' });
        }

        // Ensure the user has permission to delete this appointment
        if (userRole === 'Patient' && appointment.patient.toString() !== userId.toString()) {
            return res.status(403).json({ msg: 'Patients can only delete their own appointments.' });
        }

        if (userRole === 'Doctor' && appointment.doctor.toString() !== userId.toString()) {
            return res.status(403).json({ msg: 'Doctors can only delete their own appointments.' });
        }

        // Optional: If you want Admins to be able to delete any appointment
        if (userRole !== 'Admin' && userRole !== 'Doctor' && userRole !== 'Patient') {
            return res.status(403).json({ msg: 'Unauthorized to delete appointment.' });
        }

        const doctorId = appointment.doctor;
        const scheduleId = appointment.schedule;
        const slotId = appointment.timeSlot.id;

        // Mark the slot as available again
        await Doctor.updateOne(
            { _id: doctorId, 'specializations.schedules._id': scheduleId },
            {
                $set: { 'specializations.$.schedules.$[elem].slots.$[slot].isAvailable': true }
            },
            {
                arrayFilters: [
                    { 'elem._id': scheduleId },
                    { 'slot._id': slotId }
                ]
            }
        );

        // Delete the appointment
        await Appointment.findByIdAndDelete(appointmentId);

        return res.status(200).json({ msg: 'Appointment deleted successfully' });

    } catch (error) {
        console.error('Error deleting appointment:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};





const manageSchedules = async (req, res) => {
    const { method } = req;
    const { specializationId, day, startTime, endTime, appointmentTimeLimit, scheduleIndex, doctorId } = req.body;
    const userRole = req.user.role;  // Assuming role is stored in the JWT or session

    // Log values for debugging
    console.log('User Role:', userRole);
    console.log('Doctor ID from Request Body:', doctorId);

    // Determine which ID to use
    const idToUse = userRole === 'Admin' && doctorId ? doctorId : req.user.userId;
    console.log('ID to Use:', idToUse);

    try {
        // Fetch doctor using the determined ID
        const doctor = await Doctor.findOne({ _id: idToUse, 'specializations.specializationId': specializationId });
        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor or specialization not found' });
        }

        // Ensure the specialization ID is valid
        const specialization = doctor.specializations.find(spec =>
            spec.specializationId.equals(specializationId)
        );

        if (!specialization) {
            return res.status(400).json({ msg: 'Specialization not found for the doctor.' });
        }

        switch (method) {
            case 'POST': // Create a new schedule
                const appointmentLimit = appointmentTimeLimit || 15;

                // Convert start and end time to Date objects
                const newStartTime = new Date(`1970-01-01T${startTime}:00Z`);
                const newEndTime = new Date(`1970-01-01T${endTime}:00Z`);

                // Check for overlapping schedules
                const isOverlap = specialization.schedules.some(schedule => {
                    if (schedule.day !== day) return false; // Check only for the same day
                    const existingStart = new Date(`1970-01-01T${schedule.startTime}:00Z`);
                    const existingEnd = new Date(`1970-01-01T${schedule.endTime}:00Z`);
                    return (
                        (newStartTime >= existingStart && newStartTime < existingEnd) ||  // New start time overlaps
                        (newEndTime > existingStart && newEndTime <= existingEnd) ||     // New end time overlaps
                        (newStartTime <= existingStart && newEndTime >= existingEnd)     // New schedule surrounds an existing one
                    );
                });

                if (isOverlap) {
                    return res.status(400).json({ msg: 'Schedule overlaps with an existing one' });
                }

                // Calculate total time and number of slots
                const totalMinutes = (newEndTime - newStartTime) / (1000 * 60);
                const numSlots = Math.floor(totalMinutes / appointmentLimit);

                let appointmentSlots = [];
                for (let i = 0; i < numSlots; i++) {
                    let slotStart = new Date(newStartTime.getTime() + i * appointmentLimit * 60000);
                    let slotEnd = new Date(slotStart.getTime() + appointmentLimit * 60000);

                    appointmentSlots.push({
                        startTime: slotStart.toISOString().substring(11, 16),
                        endTime: slotEnd.toISOString().substring(11, 16),
                    });
                }

                specialization.schedules.push({
                    day,
                    startTime,
                    endTime,
                    appointmentTimeLimit: appointmentLimit,
                    appointmentSlots: appointmentSlots,
                });

                await doctor.save();

                return res.status(201).json({ msg: 'Schedule added successfully', schedule: { day, startTime, endTime, appointmentSlots } });

            case 'GET': // Retrieve schedules
                const schedules = specialization.schedules.map(schedule => ({
                    doctor: doctor._id,
                    specialization: {
                        _id: specialization.specializationId,
                        name: specialization.specializationId.name,  
                        description: specialization.specializationId.description,
                    },
                    day: schedule.day,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    appointmentTimeLimit: schedule.appointmentTimeLimit,
                    appointmentSlots: schedule.appointmentSlots,
                }));

                return res.status(200).json(schedules);

            case 'PUT': // Update a schedule
                if (!specialization.schedules[scheduleIndex]) {
                    return res.status(404).json({ msg: 'Schedule not found' });
                }

                const scheduleToUpdate = specialization.schedules[scheduleIndex];

                // New time values (if provided)
                const updatedStartTime = startTime || scheduleToUpdate.startTime;
                const updatedEndTime = endTime || scheduleToUpdate.endTime;

                const newStartTimePut = new Date(`1970-01-01T${updatedStartTime}:00Z`);
                const newEndTimePut = new Date(`1970-01-01T${updatedEndTime}:00Z`);

                // Check for overlapping schedules, excluding the current one
                const isOverlapPut = specialization.schedules.some((schedule, idx) => {
                    if (idx === scheduleIndex || schedule.day !== day) return false; // Skip the current schedule or different day
                    const existingStart = new Date(`1970-01-01T${schedule.startTime}:00Z`);
                    const existingEnd = new Date(`1970-01-01T${schedule.endTime}:00Z`);
                    return (
                        (newStartTimePut >= existingStart && newStartTimePut < existingEnd) ||
                        (newEndTimePut > existingStart && newEndTimePut <= existingEnd) ||
                        (newStartTimePut <= existingStart && newEndTimePut >= existingEnd)
                    );
                });

                if (isOverlapPut) {
                    return res.status(400).json({ msg: 'Updated schedule overlaps with an existing one' });
                }

                // Update schedule details
                scheduleToUpdate.day = day || scheduleToUpdate.day;
                scheduleToUpdate.startTime = updatedStartTime;
                scheduleToUpdate.endTime = updatedEndTime;

                if (appointmentTimeLimit) {
                    scheduleToUpdate.appointmentTimeLimit = appointmentTimeLimit;

                    // Update appointmentSlots based on the new time limit
                    const start = new Date(`1970-01-01T${scheduleToUpdate.startTime}:00Z`);
                    const end = new Date(`1970-01-01T${scheduleToUpdate.endTime}:00Z`);
                    const totalMinutes = (end - start) / (1000 * 60);
                    const numSlots = Math.floor(totalMinutes / appointmentTimeLimit);

                    scheduleToUpdate.appointmentSlots = [];
                    for (let i = 0; i < numSlots; i++) {
                        let slotStart = new Date(start.getTime() + i * appointmentTimeLimit * 60000);
                        let slotEnd = new Date(slotStart.getTime() + appointmentTimeLimit * 60000);

                        scheduleToUpdate.appointmentSlots.push({
                            startTime: slotStart.toISOString().substring(11, 16),
                            endTime: slotEnd.toISOString().substring(11, 16),
                        });
                    }
                }

                await doctor.save();
                return res.status(200).json({ msg: 'Schedule updated successfully', schedule: scheduleToUpdate });

            case 'DELETE': // Delete a schedule
                if (!specialization.schedules[scheduleIndex]) {
                    return res.status(404).json({ msg: 'Schedule not found' });
                }

                specialization.schedules.splice(scheduleIndex, 1);
                await doctor.save();

                return res.status(200).json({ msg: 'Schedule deleted successfully' });

            default:
                return res.status(405).json({ msg: 'Method not allowed' });
        }
    } catch (error) {
        return res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


const updateSlotAvailability = async (doctorId, day, breakStartTime, breakEndTime, isAvailable) => {
    // Fetch the doctor by ID
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) throw new Error('Doctor not found');

    // Iterate through each specialization of the doctor
    for (const specialization of doctor.specializations) {
        // Iterate through each schedule of the specialization
        for (const schedule of specialization.schedules) {
            if (schedule.day === day) {
                // Update slots based on break times
                schedule.slots = schedule.slots.map(slot => {
                    const slotStart = new Date(`1970-01-01T${slot.start}:00Z`);
                    const slotEnd = new Date(`1970-01-01T${slot.end}:00Z`);
                    const breakStart = new Date(`1970-01-01T${breakStartTime}:00Z`);
                    const breakEnd = new Date(`1970-01-01T${breakEndTime}:00Z`);

                    // Check if the slot overlaps with the break time
                    if (slotStart < breakEnd && slotEnd > breakStart) {
                        return { ...slot, isAvailable }; // Update availability
                    }
                    return slot;
                });

                // Update maxAppointments based on new slots availability
                schedule.maxAppointments = schedule.slots.filter(slot => slot.isAvailable).length;
            }
        }
    }

    // Save the updates to the doctor's record
    await doctor.save();
};



const manageBreaks = async (req, res) => {
    const { doctor_id, day, startTime, endTime, break_id } = req.body;

    try {
        switch (req.method) {
            case 'POST': // Create a new break
                if (!doctor_id || !day || !startTime || !endTime) {
                    return res.status(400).json({ msg: 'Missing required fields for creating a break' });
                }

                const doctor = await Doctor.findById(doctor_id);
                if (!doctor) {
                    return res.status(404).json({ msg: 'Doctor not found' });
                }

                // Check for overlapping appointments
                const existingAppointments = await Appointment.find({
                    doctor: doctor_id,
                    day,
                    $or: [
                        { startTime: { $lt: endTime, $gt: startTime } },
                        { endTime: { $lt: endTime, $gt: startTime } },
                        { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
                    ]
                });

                if (existingAppointments.length > 0) {
                    return res.status(400).json({ msg: 'Cannot create break, appointments scheduled during this time' });
                }

                // Check for overlapping breaks
                const existingBreaks = await Break.find({ doctor: doctor_id, day });
                const newBreakStart = new Date(`1970-01-01T${startTime}:00Z`);
                const newBreakEnd = new Date(`1970-01-01T${endTime}:00Z`);

                const isOverlap = existingBreaks.some(brk => {
                    const existingBreakStart = new Date(`1970-01-01T${brk.startTime}:00Z`);
                    const existingBreakEnd = new Date(`1970-01-01T${brk.endTime}:00Z`);
                    return newBreakEnd > existingBreakStart && newBreakStart < existingBreakEnd;
                });

                if (isOverlap) {
                    return res.status(400).json({ msg: 'New break overlaps with existing breaks' });
                }

                const newBreak = new Break({
                    doctor: doctor_id,
                    day,
                    startTime,
                    endTime
                });

                await newBreak.save();

                // Update Doctor document to mark slots as unavailable
                await updateSlotAvailability(doctor_id, day, startTime, endTime, false);

                return res.status(201).json({ msg: 'Break created successfully', break: newBreak });

            case 'PUT': // Update a break
                if (!break_id || !startTime || !endTime) {
                    return res.status(400).json({ msg: 'Missing required fields for updating a break' });
                }

                const updatedBreak = await Break.findById(break_id);
                if (!updatedBreak) {
                    return res.status(404).json({ msg: 'Break not found' });
                }

                // Check for overlapping appointments
                const updatedAppointments = await Appointment.find({
                    doctor: doctor_id,
                    day,
                    $or: [
                        { startTime: { $lt: endTime, $gt: startTime } },
                        { endTime: { $lt: endTime, $gt: startTime } },
                        { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
                    ]
                });

                if (updatedAppointments.length > 0) {
                    return res.status(400).json({ msg: 'Cannot update break, appointments scheduled during this time' });
                }

                // Check for overlapping breaks with the updated break
                const otherBreaks = await Break.find({ doctor: doctor_id, day }).where('_id').ne(break_id);
                const updatedBreakStart = new Date(`1970-01-01T${startTime}:00Z`);
                const updatedBreakEnd = new Date(`1970-01-01T${endTime}:00Z`);

                const isUpdateOverlap = otherBreaks.some(brk => {
                    const existingBreakStart = new Date(`1970-01-01T${brk.startTime}:00Z`);
                    const existingBreakEnd = new Date(`1970-01-01T${brk.endTime}:00Z`);
                    return updatedBreakEnd > existingBreakStart && updatedBreakStart < existingBreakEnd;
                });

                if (isUpdateOverlap) {
                    return res.status(400).json({ msg: 'Updated break overlaps with existing breaks' });
                }

                updatedBreak.startTime = startTime;
                updatedBreak.endTime = endTime;
                await updatedBreak.save();

                // Update Doctor document to reflect the change
                await updateSlotAvailability(doctor_id, day, startTime, endTime, false);

                return res.status(200).json({ msg: 'Break updated successfully', break: updatedBreak });

            case 'DELETE': // Delete a break
                if (!break_id) {
                    return res.status(400).json({ msg: 'Break ID is required for deleting a break' });
                }

                const deletedBreak = await Break.findByIdAndDelete(break_id);

                if (!deletedBreak) {
                    return res.status(404).json({ msg: 'Break not found' });
                }

                // Update Doctor document to remove the break and mark slots as available
                await updateSlotAvailability(deletedBreak.doctor, deletedBreak.day, deletedBreak.startTime, deletedBreak.endTime, true);

                return res.status(200).json({ msg: 'Break deleted successfully' });

            default:
                return res.status(405).json({ msg: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error managing break:', error);
        return res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


/*
// Main payment function
const makePayment = async (req, res) => {
    const { doctorId, patientId, amountPaid, paymentMethod, feeType, customerDetails, paymentDetails } = req.body;
    const userRole = req.user.role; // Assuming user role is attached to the request
    const isAdminOrStaff = userRole === 'Admin' || userRole === 'Staff';
    const isPatient = userRole === 'Patient';
    
    try {
      if (isAdminOrStaff && (!doctorId || !patientId)) {
        return res.status(400).json({ msg: 'Doctor ID and Patient ID are required for admin or staff payments.' });
      }
  
      const actualPatientId = isPatient ? req.user.userId : patientId;
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({ msg: 'Doctor not found' });
      }
      
      const amount = parseFloat(amountPaid);
  
      if (paymentMethod === 'Card' && isPatient) {
        const paymentResult = await processCardPayment(amount, customerDetails, paymentDetails);
        if (paymentResult.status !== 'success') {
          return res.status(400).json({ msg: 'Card payment failed', error: paymentResult.error });
        }
        
        return res.status(200).json({
          msg: "Redirect to PayHere for card payment.",
          payment_url: paymentResult.payment_url
        });
      } else if (!isAdminOrStaff && paymentMethod !== 'Card') {
        return res.status(400).json({ msg: 'Only patients can pay with cards.' });
      }
  
      if (feeType === 'Advance' && amount !== doctor.advanceFee) {
        return res.status(400).json({ msg: `Advance payment must be exactly ${doctor.advanceFee}.` });
      }
  
      if (feeType === 'Full' && amount !== doctor.fullFee) {
        return res.status(400).json({ msg: `Full payment must be exactly ${doctor.fullFee}.` });
      }
  
      const invoice = new Invoice({
        patientId: actualPatientId,
        doctorId,
        amountPaid: amount,
        paymentMethod,
        feeType,
        paymentStatus: feeType === 'Advance' ? 'Partial' : 'Completed',
        paymentDate: new Date()
      });
      await invoice.save();
  
      res.status(201).json({
        msg: `${feeType} payment of ${amount} via ${paymentMethod} is recorded.`,
        invoice
      });
  
    } catch (error) {
      console.error('Error making payment:', error);
      res.status(500).json({ msg: 'Server error', error: error.message });
    }
  };
*/

const makePayment = async (req, res) => {
    const { doctorId, patientId, amountPaid, paymentMethod, feeType, customerDetails } = req.body;
    const userRole = req.user.role; // Assuming user role is attached to the request
    const isAdminOrStaff = userRole === 'Admin' || userRole === 'Staff';
    const isPatient = userRole === 'Patient';
    
    try {
        // If the user is a patient, they must provide the doctorId and patientId
        if (isPatient && !doctorId) {
            return res.status(400).json({ msg: 'Doctor ID is required for patient payments.' });
        }

        // If the user is admin or staff, doctorId and patientId should be provided
        if (isAdminOrStaff && (!doctorId || !patientId)) {
            return res.status(400).json({ msg: 'Doctor ID and Patient ID are required for admin or staff payments.' });
        }

        // The actual patientId is determined based on the user role
        const actualPatientId = isPatient ? req.user.userId : patientId;

        // Retrieve the doctor from the database
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }
        
        const amount = parseFloat(amountPaid);

        // Handle card payment for patients
        if (paymentMethod === 'Card' && isPatient) {
            const orderId = uuidv4();
            const paymentResult = await processCardPayment(amount, customerDetails, orderId);
            console.log('PayHere Payment Result:', paymentResult); // Log to check the details
            if (paymentResult.status !== 'success') {
                return res.status(400).json({ msg: 'Card payment failed', error: paymentResult.error });
            }

            // Return the HTML form to the frontend
            return res.status(200).send(paymentResult.paymentHtml); 
        } else if (!isPatient && paymentMethod === 'Card') {
            return res.status(400).json({ msg: 'Only patients can pay with cards.' });
        }

        // Validate amounts for advance/full payments
        if (feeType === 'Advance' && amount !== doctor.advanceFee) {
            return res.status(400).json({ msg: `Advance payment must be exactly ${doctor.advanceFee}.` });
        }

        if (feeType === 'Full' && amount !== doctor.fullFee) {
            return res.status(400).json({ msg: `Full payment must be exactly ${doctor.fullFee}.` });
        }

        // Create and save the invoice
        const invoice = new Invoice({
            patientId: actualPatientId,
            doctorId,
            amountPaid: amount,
            paymentMethod,
            feeType,
            paymentStatus: feeType === 'Advance' ? 'Partial' : 'Completed',
            paymentDate: new Date()
        });
        await invoice.save();

        res.status(201).json({
            msg: `${feeType} payment of ${amount} via ${paymentMethod} is recorded.`,
            invoice
        });

    } catch (error) {
        console.error('Error making payment:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


const handlePaymentNotification = async (req, res) => {
    const { merchant_id, order_id, payment_id, status_code, md5sig, amount, currency } = req.body;

    // Verify merchant ID
    if (merchant_id !== process.env.PAYHERE_MERCHANT_ID) {
        return res.status(400).json({ msg: 'Invalid merchant ID' });
    }

    // Verify the hash signature (security check)
    const generatedMd5sig = md5(process.env.PAYHERE_MERCHANT_ID + order_id + amount + currency + process.env.PAYHERE_MERCHANT_SECRET).toString().toUpperCase();
    if (md5sig !== generatedMd5sig) {
        return res.status(400).json({ msg: 'Invalid hash signature' });
    }

    // Handle payment status
    if (status_code === '2') { // '2' indicates success
        // Update payment status in your database
        await Invoice.updateOne({ orderId: order_id }, { paymentStatus: 'Completed', paymentId: payment_id });
        res.status(200).json({ msg: 'Payment verified and recorded.' });
    } else {
        res.status(400).json({ msg: 'Payment failed or was incomplete.' });
    }
};









/*

const makePayments = async (req, res) => {
    const { doctorId, amountPaid, paymentMethod, feeType, paymentDetails } = req.body;
    const userId = req.user.userId; // Patient ID

    try {
        // Validate doctor exists
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        const totalFee = doctor.fullFee; // Full fee from doctor's details

        if (feeType === 'Advance') {
            // Handle advance payment scenario
            const advanceInvoice = new Invoice({
                userId,
                doctorId,
                amountPaid, // Advance amount
                paymentMethod,
                feeType: 'Advance',
                paymentStatus: 'Partial', // Advance payments marked as partial
                paymentDate: new Date()
            });
        
            await advanceInvoice.save();
        
            return res.status(201).json({
                msg: `Advance payment of ${amountPaid} via ${paymentMethod} is recorded.`,
                invoice: advanceInvoice
            });
        } else if (feeType === 'Full') {
            // If paying full amount, check for an existing advance payment
            const advanceInvoice = await Invoice.findOne({
                userId,
                doctorId,
                feeType: 'Advance',
                paymentStatus: 'Partial', // Check for Partial to see if there's already an advance
            });
        
            if (!advanceInvoice) {
                return res.status(400).json({ msg: 'No advance payment found for this patient and doctor.' });
            }
        
            let totalFee = doctor.fullFee; // Full fee from doctor's details
            let remainingBalance = totalFee - advanceInvoice.amountPaid; // Calculate remaining balance
        
            // Check if the amount paid is sufficient to cover the remaining balance
            if (amountPaid < remainingBalance) {
                return res.status(400).json({ msg: 'Amount paid is less than the remaining balance.' });
            }
        
            // Handle payment based on method (Cash/Card)
            let paymentStatus = 'Pending'; // Default payment status
        
            if (paymentMethod === 'Card') {
                // Replace with actual card payment processing
                const paymentSuccessful = await processCardPayment(amountPaid, req.user, paymentDetails); 
        
                if (!paymentSuccessful) {
                    return res.status(400).json({ msg: 'Payment failed' });
                }
                paymentStatus = 'Completed'; // Update payment status only on success
            } else if (paymentMethod === 'Cash') {
                // Payment status remains pending for cash until verified manually
                paymentStatus = 'Pending';
            } else {
                return res.status(400).json({ msg: 'Invalid payment method' });
            }
        
            // Update the existing advance invoice with the new amount, fee type, and status
            advanceInvoice.amountPaid += remainingBalance; // Update amount paid with the remaining balance
            advanceInvoice.paymentStatus = (advanceInvoice.amountPaid >= totalFee) ? 'Completed' : 'Partial'; // Update payment status
            advanceInvoice.paymentMethod = paymentMethod; // Update payment method if needed
            advanceInvoice.paymentDate = new Date(); // Update payment date
            advanceInvoice.feeType = 'Full'; // Update fee type to Full
        
            await advanceInvoice.save(); // Save the updated invoice
        
            return res.status(200).json({
                msg: `Payment of ${remainingBalance} via ${paymentMethod} ${advanceInvoice.paymentStatus}.`,
                invoice: advanceInvoice
            });
    
        } else {
            return res.status(400).json({ msg: 'Invalid fee type' });
        }

    } catch (error) {
        console.error('Error making payment:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};
*/


// GET invoices with null appointmentId for specific doctor or patient
const fetchInvoices = async (req, res) => {
    const userRole = req.user.role;
    const userId = req.user.userId;
    const { doctor_id, patient_id } = req.query;

    try {
        const query = {
            appointmentId: null,  // Fetch invoices where the appointment is not yet placed
        };

        // Role-based filtering and conditions
        if (userRole === 'Doctor') {
            // Doctor can only view their own invoices or specific patient invoices
            query.doctorId = userId;

            if (patient_id) {
                query.patientId = patient_id;  // Optional filter for patient if provided
            }
        } else if (userRole === 'Admin') {
            // Admin can filter by both doctor and patient IDs, or just patient ID
            if (doctor_id) {
                query.doctorId = doctor_id;
            }
            if (patient_id) {
                query.patientId = patient_id;
            }
        } else if (userRole === 'Patient') {
            // Patients can only view their own invoices
            query.patientId = userId;
        } else {
            return res.status(403).json({ msg: 'Only Admin, Doctors, and Patients can view invoices.' });
        }

        // Fetch the invoices based on the constructed query
        const invoices = await Invoice.find(query).sort({ createdAt: -1 });

        if (invoices.length === 0) {
            return res.status(404).json({ msg: 'No invoices found.' });
        }

        res.status(200).json({ msg: 'Invoices retrieved successfully', invoices });

    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};



const checkBalance = async (req, res) => {
    const userId = req.user.userId; // ID of the user making the request
    const userRole = req.user.role; // Role of the user (Admin, Staff, Patient)
    const { doctorId, patientId, invoiceId } = req.query; // Doctor ID, Patient ID, and Invoice ID from query params

    try {
        // Check if the user has the necessary role
        if (userRole !== 'Admin' && userRole !== 'Staff' && userRole !== 'Patient') {
            return res.status(403).json({ msg: 'Access denied. Only Admin, Staff, and Patients can access this information.' });
        }

        // Determine patientId based on user role
        let actualPatientId;
        if (userRole === 'Patient') {
            actualPatientId = userId; // Patient uses their own ID
        } else {
            // Admin and Staff should provide both doctorId and patientId if invoiceId is not provided
            if (!invoiceId && (!doctorId || !patientId)) {
                return res.status(400).json({ msg: 'Either invoiceId or both doctorId and patientId are required for Admin and Staff.' });
            }
            actualPatientId = patientId;
        }

        // Check if invoiceId is provided and find by invoiceId
        let advanceInvoice;
        if (invoiceId) {
            advanceInvoice = await Invoice.findById(invoiceId);
            if (!advanceInvoice) {
                return res.status(404).json({ msg: 'Invoice not found' });
            }

            // Ensure the invoice belongs to the correct patient and doctor and has a 'Partial' payment status
            if (advanceInvoice.patientId.toString() !== actualPatientId || advanceInvoice.paymentStatus !== 'Partial') {
                return res.status(400).json({ msg: 'Invoice does not belong to this patient or is not a partial payment.' });
            }

        } else {
            // Validate doctor existence if invoiceId is not provided
            const doctor = await Doctor.findById(doctorId);
            if (!doctor) {
                return res.status(404).json({ msg: 'Doctor not found' });
            }
            // Find the latest advance invoice with 'Partial' payment status for the patient and doctor
            advanceInvoice = await Invoice.findOne({
                patientId: actualPatientId,
                doctorId,
                feeType: 'Advance',
                paymentStatus: 'Partial'
            }).sort({ paymentDate: -1 }); // Sort by paymentDate in descending order to get the latest

            if (!advanceInvoice) {
                return res.status(404).json({ msg: 'No unpaid advance payment found for this patient and doctor.' });
            }
        }
        // Calculate the remaining balance
        const doctor = await Doctor.findById(advanceInvoice.doctorId);
        const totalFee = doctor.fullFee;
        const amountPaid = advanceInvoice.amountPaid;
        const remainingBalance = totalFee - amountPaid;

        // Return the remaining balance and latest invoice details
        return res.status(200).json({
            msg: `The remaining balance is ${remainingBalance}.`,
            balance: remainingBalance,
            totalFee,
            amountPaid,
            advanceInvoice
        });
    } catch (error) {
        console.error('Error retrieving balance:', error);
        return res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


const payBalance = async (req, res) => {
    const userId = req.user.userId; // ID of the user making the request
    const userRole = req.user.role; // Role of the user (Admin, Staff, Patient)
    const { paymentMethod } = req.body; // Payment method from the request body
    const { doctorId, patientId, invoiceId } = req.query; // Get doctorId, patientId, and invoiceId from query

    try {
        // Check if the user is either Admin, Staff, or Patient
        if (userRole !== 'Admin' && userRole !== 'Staff' && userRole !== 'Patient') {
            return res.status(403).json({ msg: 'Access denied. Only Admin, Staff, and Patients can access this information.' });
        }

        // Determine patientId based on user role
        const actualPatientId = userRole === 'Patient' ? userId : patientId;

        if (!actualPatientId) {
            return res.status(400).json({ msg: 'Patient ID is required.' });
        }

        // Validate doctor exists
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        // Find the invoice by invoiceId
        const advanceInvoice = await Invoice.findById(invoiceId);
        if (!advanceInvoice) {
            return res.status(404).json({ msg: 'Invoice not found.' });
        }

        // Ensure the invoice belongs to the correct patient and doctor and has a 'Partial' payment status
        if (advanceInvoice.patientId.toString() !== actualPatientId || advanceInvoice.doctorId.toString() !== doctorId || advanceInvoice.paymentStatus !== 'Partial') {
            return res.status(400).json({ msg: 'Invoice does not belong to this patient or doctor, or it is not a partial payment.' });
        }

        // Calculate the total fee and remaining balance
        const totalFee = doctor.fullFee;
        const remainingBalance = totalFee - advanceInvoice.amountPaid;

        // Get the balance to pay from the request body
        const balanceToPay = req.body.balance; // Now expecting balance in the request body

        // Check if the balance to pay is sufficient to cover the remaining balance
        if (balanceToPay < remainingBalance) {
            return res.status(400).json({ msg: 'Balance to pay is less than the remaining balance.' });
        }

        // Update the advance invoice with the new amount and status
        advanceInvoice.amountPaid += remainingBalance; // Pay off the remaining balance
        advanceInvoice.paymentStatus = 'Completed'; // Mark as completed
        advanceInvoice.paymentMethod = paymentMethod || advanceInvoice.paymentMethod; // Keep existing payment method
        advanceInvoice.paymentDate = new Date(); // Update payment date
        advanceInvoice.feeType = 'Full'; // Change feeType to 'Full' since the balance is settled

        await advanceInvoice.save(); // Save the updated invoice

        // Now update the payment status in the Appointment document
        if (advanceInvoice.appointmentId) {
            const appointment = await Appointment.findById(advanceInvoice.appointmentId);
            if (appointment) {
                appointment.paymentStatus = 'Completed'; // Mark the appointment as fully paid
                await appointment.save(); // Save the updated appointment
            }
        }

        return res.status(200).json({
            msg: `Balance payment of ${remainingBalance} via ${paymentMethod} is recorded. The invoice is now fully paid.`,
            invoice: advanceInvoice
        });
    } catch (error) {
        console.error('Error paying balance:', error);
        return res.status(500).json({ msg: 'Server error', error: error.message });
    }
};




const getInvoice = async (req, res) => {
    try {
        // Get the logged-in user's ID and role
        const loggedInUserId = req.user.userId; // From authentication middleware
        const userRole = req.user.role; // From authentication middleware

        // Get doctorId or patientId from query string
        const { doctorId, patientId } = req.query;

        // Initialize filter object
        const filter = {};

        // Role-based filtering
        if (userRole === 'Doctor') {
            // If the logged-in user is a doctor, they can only fetch their own invoices
            filter.doctorId = loggedInUserId; // Use the logged-in doctor's ID
        } else if (userRole === 'Patient') {
            // If the logged-in user is a patient, they can only fetch their own invoices
            filter.userId = loggedInUserId; // Use the logged-in patient's ID
        } else if (userRole === 'Admin') {
            // Admins can fetch all invoices or filter by doctorId/patientId if provided
            if (doctorId) filter.doctorId = doctorId;
            if (patientId) filter.patientId = patientId;
        } else {
            return res.status(403).json({ message: 'You do not have permission to access these invoices.' });
        }

        // Fetch invoices based on the filter (will fetch all if no filter is set for Admin)
        const invoices = await Invoice.find(filter).sort({ createdAt: -1 });

        if (invoices.length === 0) {
            return res.status(404).json({ message: 'No invoices found' });
        }

        // Send the invoices in the response
        res.json({
            message: 'Invoices retrieved successfully',
            invoices,
        });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};





const searchReports = async (req, res) => {
    const { startDate, endDate, doctor, specialization, status } = req.query;

    // Initialize filters object
    const filters = {};

    // If startDate is provided, add it to the filters
    if (startDate) filters.startDate = { $gte: new Date(startDate) };

    // If endDate is provided, add it to the filters
    if (endDate) filters.endDate = { $lte: new Date(endDate) };

    // If doctor is provided, add it to the filters
    if (doctor) filters.doctor = doctor;

    // If specialization is provided, add it to the filters
    if (specialization) filters.specialization = specialization;

    // If status is provided, add it to the filters
    if (status) filters.status = status;

    try {
        // Fetch reports based on the filters
        const reports = await Report.find(filters);

        // Send the reports in the response
        res.status(200).json(reports);
    } catch (error) {
        console.error('Error searching reports:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

const createReport = async (req, res) => {
    const { doctor, specialization, status, description, startDate, endDate } = req.body;

    try {
        // Create a new report with the given parameters
        const newReport = new Report({
            doctor,
            specialization,
            status,
            description,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
        });

        // Save the report to the database
        await newReport.save();

        // Send a success response with the created report
        res.status(201).json({ msg: 'Report created successfully', report: newReport });
    } catch (error) {
        // Log the error message
        console.error('Error creating report:', error);
        // Send an error response with the error message
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


const updateReport = async (req, res) => {
    const { reportId } = req.params;
    const { doctor, specialization, status, description, startDate, endDate } = req.body;

    try {
        // Find the report with the given ID
        const report = await Report.findById(reportId);
        if (!report) {
            // If the report is not found, return a 404 error
            return res.status(404).json({ msg: 'Report not found' });
        }

        // Update the report fields
        report.doctor = doctor;
        report.specialization = specialization;
        report.status = status;
        report.description = description;
        report.startDate = new Date(startDate);
        report.endDate = new Date(endDate);

        // Save the updated report
        await report.save();

        // Send a success response with the updated report
        res.status(200).json({ msg: 'Report updated successfully', report });
    } catch (error) {
        // Log the error message
        console.error('Error updating report:', error);
        // Send an error response with the error message
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


const deleteReport = async (req, res) => {
    const { reportId } = req.params;

    try {
        // Find the report by ID
        const report = await Report.findById(reportId);

        // If the report is not found, return a 404 error
        if (!report) {
            return res.status(404).json({ msg: 'Report not found' });
        }

        // Delete the report
        await report.remove();

        // Return a success response with the deleted report
        res.status(200).json({ msg: 'Report deleted successfully' });
    } catch (error) {
        // If an error occurs, log the error and return a 500 response with the error message
        console.error('Error deleting report:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


const downloadReport = async (req, res) => {
    const { startDate, endDate, doctor, specialization, status } = req.query;

    // Construct filter object based on query parameters
    const filters = {};
    if (startDate) filters.startDate = { $gte: new Date(startDate) };
    if (endDate) filters.endDate = { $lte: new Date(endDate) };
    if (doctor) filters.doctor = doctor;
    if (specialization) filters.specialization = specialization;
    if (status) filters.status = status;

    try {
        // Fetch reports from the database based on the filters
        const reports = await Report.find(filters).populate('doctor specialization');

        // Map report data to a format suitable for CSV
        const reportData = reports.map(report => ({
            Doctor: report.doctor.name,
            Specialization: report.specialization.name,
            Status: report.status,
            Description: report.description,
            StartDate: report.startDate,
            EndDate: report.endDate
        }));

        // Convert report data to CSV format
        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(reportData);

        // Set response headers to trigger file download
        res.setHeader('Content-Disposition', 'attachment;filename=appointment_report.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.status(200).send(csv);
    } catch (error) {
        // Handle errors and send server error response
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};







module.exports = { loginUser,viewUserDetails,updatePersonalDetails,changeOwnPassword, createUser, getUserById, updateUser,
     deleteUser,getDoctorsBySpecialization,getAvailableSlotsForDoctor,getAvailableDaysForDoctor,getPatients,
     placeAppointment,updateAppointment,deleteAppointment,getAppointments, manageSchedules,manageBreaks,makePayment,
     handlePaymentNotification,checkBalance,payBalance,searchReports,createReport,updateReport,
     deleteReport,downloadReport,getInvoice,fetchInvoices };
