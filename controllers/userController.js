const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Staff = require('../models/Staff');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Permission = require('../models/Permission');
const Appointment = require('../models/Appointment'); 
const Break = require('../models/Break');



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
            return res.status(200).json({ msg: 'Password change required', mustChangePassword: true, token });
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


        // Return token (you don't need to return permissions separately)
        return res.status(200).json({ token });

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
        // If an error occurs, return a server error message
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

const updatePersonalDetails = async (req, res) => {
    // Extract the JWT token from the Authorization header
    const token = req.headers.authorization.split(' ')[1];

    try {
        // Decode the token to get user information
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Determine the model based on the user's ID
        const UserModel = await getUserModel(userId);
        if (!UserModel) {
            return res.status(404).json({ msg: 'User model not found' });
        }

        // Find the user by ID
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Extract fields from request body
        const { currentPassword, newPassword, ...updates } = req.body;

        // Handle password update if provided
        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Current password is incorrect' });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        // Update other fields (name, contact, profile picture, etc.)
        Object.keys(updates).forEach((key) => {
            if (updates[key]) {
                user[key] = updates[key];
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
        res.status(400).json({ msg: 'Error updating user details' });
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
        // Fetch the doctor's details
        const doctor = await Doctor.findById(doctor_id)
            .populate('specializations.specializationId', 'name description');

        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        // Fetch breaks for the day
        const breaks = await Break.find({ doctor: doctor_id, day });

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

                    // Only push the slot if it is marked as available and is not affected by a break
                    if (slot.isAvailable && !hasBreak) {
                        updatedSlots.push({
                            id: slot._id, // Assuming slot has an _id field
                            start: slot.start,
                            end: slot.end,
                            isAvailable: true
                        });
                    }
                }

                // Only include schedules with available slots
                if (updatedSlots.length > 0) {
                    availableSchedules.push({
                        scheduleId: schedule._id,
                        slots: updatedSlots,
                    });
                }
            }
        }

        // Return the available schedules or a message if none are available
        if (availableSchedules.length > 0) {
            return res.status(200).json({ availableSchedules });
        } else {
            return res.status(200).json({ msg: 'No available slots for the selected day.' });
        }

    } catch (error) {
        console.error('Error fetching available slots for doctor:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};




const getAvailableDaysForDoctor = async (req, res) => {
    const { doctor_id, specialization_id } = req.query;

    try {
        // Fetch the doctor's details
        const doctor = await Doctor.findById(doctor_id)
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
        const breaks = await Break.find({ doctor: doctor._id });

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
    const { specialization_id, day, schedule_id, selectedSlot } = req.body;
    
    const userId = req.user._id; // Get user ID from the token
    const userRole = req.user.role; // Get user role from the token

    try {
        let doctorId;
        let patient_id;

        if (userRole === 'Doctor') {
            doctorId = userId; // Use the logged-in doctor's ID
        } else if (userRole === 'Admin') {
            doctorId = req.body.doctor_id;
            if (!doctorId) {
                return res.status(400).json({ msg: 'Doctor ID is required for Admin' });
            }
            patient_id = req.body.patient_id;
            if (!patient_id) {
                return res.status(400).json({ msg: 'Patient ID is required for Admin' });
            }
        } else if (userRole === 'Patient') {
            return res.status(403).json({ msg: 'Patients cannot place appointments for themselves directly.' });
        } else {
            return res.status(400).json({ msg: 'Invalid user role' });
        }

        const specializationId = new mongoose.Types.ObjectId(specialization_id);
        const scheduleId = new mongoose.Types.ObjectId(schedule_id);
        const slotId = selectedSlot.id; // Use slot ID

        // Find the doctor based on the doctorId
        const doctor = await Doctor.findById(doctorId)
            .populate('specializations.specializationId', 'name description');

        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        const specialization = doctor.specializations.find(spec =>
            spec.specializationId.equals(specializationId)
        );

        if (!specialization) {
            return res.status(400).json({ msg: 'Doctor does not have the required specialization' });
        }

        const schedule = specialization.schedules.find(sch => 
            sch._id.equals(scheduleId) && sch.day === day
        );

        if (!schedule) {
            return res.status(400).json({ msg: 'Invalid schedule ID or doctor does not work on the selected day.' });
        }

        const slot = schedule.slots.find(slot =>
            slot._id.toString() === slotId.toString()
        );

        if (!slot || !slot.isAvailable) {
            return res.status(400).json({ msg: 'Selected slot is no longer available.' });
        }

        // Fetch existing appointments that overlap with the selected slot
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

        // Create the new appointment with slotId
        const newAppointment = new Appointment({
            doctor: doctorId,
            patient: userRole === 'Admin' ? patient_id : userId,
            day,
            timeSlot: { id: slotId, start: slot.start, end: slot.end },  // Use start and end from the slot
            specialization: specializationId,
            schedule: scheduleId
 // Save the slotId here
        });

        await newAppointment.save();

        // Update the slot's availability
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

        res.status(201).json({ msg: 'Appointment placed successfully', appointment: newAppointment });

    } catch (error) {
        console.error('Error placing appointment:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};



const updateAppointment = async (req, res) => {
    const { appointmentId, doctor_id, schedule_id, selectedSlot, day } = req.body; // Add day from request body
    const userId = req.user._id;
    const userRole = req.user.role;

    // Check if selectedSlot is valid
    if (!selectedSlot || !selectedSlot.id) {
        return res.status(400).json({ msg: 'Invalid slot data. Please provide valid slot information.' });
    }

    // Ensure a valid day is provided
    if (!day) {
        return res.status(400).json({ msg: 'Please provide a valid day of the week.' });
    }

    try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ msg: 'Appointment not found' });
        }

        // Ensure the user has permission to update this appointment
        if (userRole === 'Patient' && appointment.patient.toString() !== userId.toString()) {
            return res.status(403).json({ msg: 'Patients can only update their own appointments.' });
        }

        const doctorId = doctor_id || appointment.doctor;
        const previousSlotId = appointment.timeSlot.id;
        const previousScheduleId = appointment.schedule;

        const scheduleId = new mongoose.Types.ObjectId(schedule_id);
        const slotId = selectedSlot.id;

        // Find the doctor
        const doctor = await Doctor.findById(doctorId)
            .populate('specializations.specializationId', 'name description');

        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        const specialization = doctor.specializations.find(spec =>
            spec.specializationId.equals(appointment.specialization)
        );

        if (!specialization) {
            return res.status(400).json({ msg: 'Doctor does not have the required specialization.' });
        }

        // Find the schedule for the specified day
        const schedule = specialization.schedules.find(sch =>
            sch._id.equals(scheduleId) && sch.day === day
        );

        if (!schedule) {
            return res.status(400).json({ msg: 'Invalid schedule ID or doctor does not work on the selected day.' });
        }

        const newSlot = schedule.slots.find(slot => slot._id.toString() === slotId.toString());

        if (!newSlot || !newSlot.isAvailable) {
            return res.status(400).json({ msg: 'Selected slot is no longer available.' });
        }

        // Fetch overlapping appointments and breaks for the same day
        const overlappingAppointments = await Appointment.find({
            doctor: doctorId,
            day: day, // Use the day instead of date
            schedule: scheduleId,
            $and: [
                { 'timeSlot.end': { $gt: newSlot.start } },
                { 'timeSlot.start': { $lt: newSlot.end } }
            ]
        });

        const overlappingBreaks = await Break.find({
            doctor: doctorId,
            day: day, // Use the day of the week
            $and: [
                { endTime: { $gt: newSlot.start } },
                { startTime: { $lt: newSlot.end } }
            ]
        });

        const hasOverlap = overlappingAppointments.length > 0 || overlappingBreaks.length > 0;
        if (hasOverlap) {
            return res.status(400).json({ msg: 'Selected slot is no longer available due to overlapping appointment or break.' });
        }

        // Update the appointment with the new day and slot
        appointment.schedule = scheduleId;
        appointment.timeSlot = { id: slotId };
        appointment.day = day; // Update the day of the week
        if (doctor_id) {
            appointment.doctor = doctorId;
        }

        await appointment.save();

        // Update the new slot's availability to false
        await Doctor.updateOne(
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

        // Update the previous slot's availability to true
        await Doctor.updateOne(
            { _id: doctorId, 'specializations.schedules._id': previousScheduleId },
            {
                $set: { 'specializations.$.schedules.$[elem].slots.$[slot].isAvailable': true }
            },
            {
                arrayFilters: [
                    { 'elem._id': previousScheduleId },
                    { 'slot._id': previousSlotId }
                ]
            }
        );

        res.status(200).json({ msg: 'Appointment updated successfully', appointment });

    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};



const getAppointments = async (req, res) => {
    const userId = req.user._id; // Get user ID from the token
    const userRole = req.user.role; // Get user role from the token

    const { doctorId, patientId } = req.query; // No date in query

    try {
        let query = {};

        // If the user is a Doctor
        if (userRole === 'Doctor') {
            query.doctor = userId; // Doctor can only see their own appointments
        }
        // If the user is an Admin
        else if (userRole === 'Admin') {
            if (!doctorId) {
                return res.status(400).json({ msg: 'Admin must select a doctor to view appointments.' });
            }
            query.doctor = doctorId; // Admin must specify doctor

            // Optional patient filter
            if (patientId) {
                query.patient = patientId; // Admin can filter by patient if provided
            }
        } else {
            return res.status(403).json({ msg: 'Only doctors and admins can view appointments.' });
        }

        // Fetch appointments based on the query
        const appointments = await Appointment.find(query)
            .populate('doctor', 'name') // Populate doctor details
            .populate('patient', 'name') // Populate patient details
            .populate('specialization', 'name') // Populate specialization details
            .sort({ day: 1, 'timeSlot.start': 1 }); // Sort by day and start time

        res.status(200).json({
            appointments,
        });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};



const deleteAppointment = async (req, res) => {
    const { appointmentId } = req.params; // Appointment ID from request parameters
    const userId = req.user._id; // Get user ID from the token
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

        // Admin can delete any appointment
        if (userRole === 'Doctor' && appointment.doctor.toString() !== userId.toString()) {
            return res.status(403).json({ msg: 'Doctors can only delete their own appointments.' });
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


        res.status(200).json({ msg: 'Appointment deleted successfully' });

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
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) throw new Error('Doctor not found');

    for (const specialization of doctor.specializations) {
        for (const schedule of specialization.schedules) {
            if (schedule.day === day) {
                schedule.slots = schedule.slots.map(slot => {
                    const slotStart = new Date(`1970-01-01T${slot.start}:00Z`);
                    const slotEnd = new Date(`1970-01-01T${slot.end}:00Z`);
                    const breakStart = new Date(`1970-01-01T${breakStartTime}:00Z`);
                    const breakEnd = new Date(`1970-01-01T${breakEndTime}:00Z`);
                    
                    if (slotStart < breakEnd && slotEnd > breakStart) {
                        return { ...slot, isAvailable };
                    }
                    return slot;
                });

                // Update maxAppointments based on new slots
                schedule.maxAppointments = schedule.slots.filter(slot => slot.isAvailable).length;
            }
        }
    }

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

            case 'GET': // Search for breaks
                if (!doctor_id || !day) {
                    return res.status(400).json({ msg: 'Doctor ID and day are required for searching breaks' });
                }

                const breaks = await Break.find({ doctor: doctor_id, day });
                return res.status(200).json(breaks);

            case 'PUT': // Update a break
                if (!break_id || !startTime || !endTime) {
                    return res.status(400).json({ msg: 'Missing required fields for updating a break' });
                }
            
                const updatedBreak = await Break.findById(break_id);
                if (!updatedBreak) {
                    return res.status(404).json({ msg: 'Break not found' });
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





module.exports = { loginUser,viewUserDetails,updatePersonalDetails,changeOwnPassword, createUser, getUserById, updateUser,
     deleteUser,getDoctorsBySpecialization,getAvailableSlotsForDoctor,getAvailableDaysForDoctor,getPatients,
     placeAppointment,updateAppointment,deleteAppointment,getAppointments, manageSchedules,manageBreaks };
