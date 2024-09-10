const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Staff = require('../models/Staff');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Permission = require('../models/Permission');
const Appointment = require('../models/Appointment'); 



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
    const { specialization_id, day } = req.query;

    try {
        // Fetch doctors based on the specialization
        const doctors = await Doctor.find({
            'specializations.specializationId': specialization_id
        }).populate('specializations.specializationId', 'name description');

        if (!doctors.length) {
            return res.status(404).json({ msg: 'No doctors found for the given specialization' });
        }

        // Check availability of each doctor on the specific day
        const doctorsWithAvailability = await Promise.all(doctors.map(async (doctor) => {
            // Find the specialization
            const specialization = doctor.specializations.find(spec => 
                spec.specializationId.equals(specialization_id)
            );

            // Filter schedules for the given day
            const schedulesForDay = specialization.schedules.filter(schedule => schedule.day === day);

            // If no schedules found for the day, return an empty list of schedules
            if (schedulesForDay.length === 0) {
                return {
                    doctor: {
                        _id: doctor._id,
                        name: doctor.name,
                        email: doctor.email,
                        professionalInfo: doctor.professionalInfo,
                        specializations: doctor.specializations,
                    },
                    schedules: [],
                    availability: {
                        totalAppointments: 0,
                        isAvailable: false,
                        availableSlots: 0
                    }
                };
            }

            // Fetch appointments for the doctor on the specific day
            const appointments = await Appointment.find({
                doctor: doctor._id,
                day: day,
                status: 'Scheduled'
            });

            // Map through the schedules to get availability details
            const schedulesWithAvailability = schedulesForDay.map(schedule => {
                const isAvailable = schedule.appointmentCount < schedule.maxAppointments;
                const availableSlots = schedule.maxAppointments - schedule.appointmentCount;

                return {
                    ...schedule.toObject(),
                    availability: {
                        totalAppointments: appointments.length,
                        isAvailable: isAvailable,
                        availableSlots: availableSlots
                    }
                };
            });

            return {
                doctor: {
                    _id: doctor._id,
                    name: doctor.name,
                    email: doctor.email,
                    professionalInfo: doctor.professionalInfo,
                    specializations: doctor.specializations,
                },
                schedules: schedulesWithAvailability
            };
        }));

        // Filter out doctors who don't have any relevant schedules
        const filteredDoctors = doctorsWithAvailability.filter(doctor => doctor.schedules.length > 0);

        res.status(200).json(filteredDoctors);
    } catch (error) {
        console.error('Error fetching doctors by specialization:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};




const getAvailableSlotsForDoctor = async (req, res) => {
    const { doctor_id, day } = req.query;

    try {
        // Fetch the doctor with their specializations and schedules
        const doctor = await Doctor.findById(doctor_id)
            .populate('specializations.specializationId', 'name description');

        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        // Initialize the response array for available schedules
        const availableSchedules = [];

        // Loop through each specialization
        doctor.specializations.forEach(specialization => {
            // Filter schedules by the selected day
            const schedulesForDay = specialization.schedules.filter(schedule => schedule.day === day);

            // Loop through each schedule
            schedulesForDay.forEach(schedule => {
                // Check if the schedule has available slots
                const isAvailable = schedule.appointmentCount < schedule.maxAppointments;

                availableSchedules.push({
                    scheduleId: schedule._id,
                    isAvailable
                });
            });
        });

        res.status(200).json({ availableSchedules });

    } catch (error) {
        console.error('Error fetching available slots for doctor:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};




const getAvailableDaysForDoctor = async (req, res) => {
    const { doctor_id, specialization_id } = req.query;


    try {
        // Fetch the doctor's details with specializations populated
        const doctor = await Doctor.findById(doctor_id)
            .populate('specializations.specializationId', 'name description');

        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        // Find the correct specialization
        const specialization = doctor.specializations.find(spec =>
            spec.specializationId.equals(specialization_id)
        );

        if (!specialization) {
            return res.status(400).json({ msg: 'Doctor does not have the required specialization' });
        }

        // Initialize an object to hold available days and their slots
        let availableDays = {};

        // Loop through each schedule
        specialization.schedules.forEach(schedule => {
            const { day, _id, appointmentCount, maxAppointments } = schedule;

            // If the schedule is not fully booked
            if (appointmentCount < maxAppointments) {
                const availableSlots = maxAppointments - appointmentCount;  // Number of available slots

                availableDays[day] = {
                    isAvailable: true,
                    scheduleId: _id,
                    availableSlots
                };
            }
        });

        if (Object.keys(availableDays).length === 0) {
            return res.status(200).json({
                msg: 'No available days found for the selected doctor',
                availableDays: []
            });
        }

        res.status(200).json({ availableDays });

    } catch (error) {
        console.error('Error fetching available days for doctor:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};




const getPatients = async (req, res) => {
    try {
        // Fetch all patients from the database
        const patients = await Patient.find({}, '_id name email');

        // Check if patients exist
        if (!patients.length) {
            return res.status(404).json({ msg: 'No patients found' });
        }

        // Return the list of patients in JSON format
        res.status(200).json(patients);
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

const placeAppointment = async (req, res) => {
    const { doctor_id, patient_id, specialization_id, day, schedule_id } = req.body;

    try {
        const doctorId = new mongoose.Types.ObjectId(doctor_id);
        const specializationId = new mongoose.Types.ObjectId(specialization_id);
        const scheduleId = new mongoose.Types.ObjectId(schedule_id);

        const patient = await Patient.findById(patient_id);
        if (!patient) {
            return res.status(404).json({ msg: 'Patient not found' });
        }

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

        const timeLimitPerAppointment = schedule.appointmentTimeLimit || 15; 

        const startTimeString = `1970-01-01T${schedule.startTime}:00Z`;
        const endTimeString = `1970-01-01T${schedule.endTime}:00Z`;

        const startTime = new Date(startTimeString);
        const endTime = new Date(endTimeString);

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            return res.status(400).json({ msg: 'Invalid time format' });
        }

        const totalMinutes = (endTime - startTime) / 60000; 
        const maxAppointments = Math.floor(totalMinutes / timeLimitPerAppointment);

        if (schedule.appointmentCount >= maxAppointments) {
            return res.status(400).json({
                msg: `All appointment slots are filled for the selected schedule on ${day}. Please choose another day or schedule.`
            });
        }

        const nextAvailableSlot = new Date(startTime.getTime() + schedule.appointmentCount * timeLimitPerAppointment * 60000);
        const appointmentEnd = new Date(nextAvailableSlot.getTime() + timeLimitPerAppointment * 60000);

        if (nextAvailableSlot < startTime || appointmentEnd > endTime) {
            return res.status(400).json({ msg: 'Appointment time is outside the schedule time range.' });
        }

        const formatTime = (date) => {
            if (isNaN(date.getTime())) return 'Invalid';
            return date.toISOString().substr(11, 5); 
        };

        // Check for overlapping appointments
        const existingAppointments = await Appointment.find({
            doctor: doctorId,
            day,
            schedule: scheduleId,
            $and: [
                { 'timeSlot.end': { $gt: formatTime(nextAvailableSlot) } },
                { 'timeSlot.start': { $lt: formatTime(appointmentEnd) } }
            ]
        });

        if (existingAppointments.length > 0) {
            return res.status(400).json({ msg: 'Selected time slot overlaps with an existing appointment.' });
        }

        // Check if the patient already has an appointment with the doctor on the same day and schedule
        const existingPatientAppointment = await Appointment.findOne({
            doctor: doctorId,
            patient: patient_id,
            day: day.trim().toLowerCase(),  // Normalize day comparison (optional)
            schedule: scheduleId
        });
        

        if (existingPatientAppointment) {
            return res.status(400).json({
                msg: 'Patient already has an appointment with this doctor for the selected schedule on the same day.'
            });
        }

        const slotIndex = schedule.appointmentCount;

        const newAppointment = new Appointment({
            doctor: doctorId,
            patient: patient_id,
            day,
            timeSlot: {
                start: formatTime(nextAvailableSlot),
                end: formatTime(appointmentEnd),
            },
            specialization: specializationId,
            schedule: scheduleId,
            slotIndex 
        });

        await newAppointment.save();

        schedule.appointmentCount += 1;
        await doctor.save();

        res.status(201).json({ msg: 'Appointment placed successfully', appointment: newAppointment });

    } catch (error) {
        console.error('Error placing appointment:', error);
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
                const start = new Date(`1970-01-01T${startTime}:00Z`);
                const end = new Date(`1970-01-01T${endTime}:00Z`);

                // Calculate total time and number of slots
                const totalMinutes = (end - start) / (1000 * 60);
                const numSlots = Math.floor(totalMinutes / appointmentLimit);

                let appointmentSlots = [];
                for (let i = 0; i < numSlots; i++) {
                    let slotStart = new Date(start.getTime() + i * appointmentLimit * 60000);
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
                    maxAppointments: numSlots,
                    appointmentSlots: appointmentSlots,
                    appointmentCount: 0,
                });

                await doctor.save();

                return res.status(201).json({ msg: 'Schedule added successfully', schedule: { day, startTime, endTime, maxAppointments: numSlots } });

            case 'GET': // Retrieve schedules
                const schedules = specialization.schedules.map(schedule => ({
                    doctor: doctor._id,
                    specialization: {
                        _id: specialization.specializationId,
                        // Assuming `name` and `description` are stored in the specializationId document
                        name: specialization.specializationId.name,  
                        description: specialization.specializationId.description,
                    },
                    day: schedule.day,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    appointmentTimeLimit: schedule.appointmentTimeLimit,
                    maxAppointments: schedule.maxAppointments,
                    appointmentCount: schedule.appointmentCount,
                    appointmentSlots: schedule.appointmentSlots,
                }));

                return res.status(200).json(schedules);

            case 'PUT': // Update a schedule
                if (!specialization.schedules[scheduleIndex]) {
                    return res.status(404).json({ msg: 'Schedule not found' });
                }

                const schedule = specialization.schedules[scheduleIndex];

                schedule.day = day || schedule.day;
                schedule.startTime = startTime || schedule.startTime;
                schedule.endTime = endTime || schedule.endTime;

                if (appointmentTimeLimit) {
                    schedule.appointmentTimeLimit = appointmentTimeLimit;

                    // Update maxAppointments and appointmentSlots based on the new time limit
                    const start = new Date(`1970-01-01T${schedule.startTime}:00Z`);
                    const end = new Date(`1970-01-01T${schedule.endTime}:00Z`);
                    const totalMinutes = (end - start) / (1000 * 60);
                    const numSlots = Math.floor(totalMinutes / appointmentTimeLimit);

                    schedule.maxAppointments = numSlots;

                    schedule.appointmentSlots = [];
                    for (let i = 0; i < numSlots; i++) {
                        let slotStart = new Date(start.getTime() + i * appointmentTimeLimit * 60000);
                        let slotEnd = new Date(slotStart.getTime() + appointmentTimeLimit * 60000);

                        schedule.appointmentSlots.push({
                            startTime: slotStart.toISOString().substring(11, 16),
                            endTime: slotEnd.toISOString().substring(11, 16),
                        });
                    }
                }

                await doctor.save();
                return res.status(200).json({ msg: 'Schedule updated successfully', schedule });

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






module.exports = { loginUser,viewUserDetails,updatePersonalDetails,changeOwnPassword, createUser, getUserById, updateUser,
     deleteUser,getDoctorsBySpecialization,getAvailableSlotsForDoctor,getAvailableDaysForDoctor,getPatients,placeAppointment,manageSchedules };
