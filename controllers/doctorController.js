// controllers/doctorController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const sendEmail = require('../utils/sendEmail');
const Doctor = require('../models/Doctor');
const Schedule = require('../models/Schedule');
const Specialization = require('../models/Specialization');
const PendingDoctor = require('../models/PendingDoctor');
const Invitation = require('../models/Invitation');


const registerDoctor = async (req, res) => {
    const { name, password, professionalInfo, schedules, specializations } = req.body;
    const { token } = req.params;

    try {
        // Find the invitation with the given token
        const invitation = await Invitation.findOne({ invitationToken: token });

        if (!invitation || invitation.isInvitationUsed) {
            return res.status(400).json({ msg: 'Invalid or expired token.' });
        }

        // Hash the doctor password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new doctor with the given information
        const pendingDoctor = new PendingDoctor({
            name,
            email: invitation.email, // Use the email from the invitation
            password: hashedPassword,
            professionalInfo,
            specializations,
            schedules: [],
        });

        if (schedules && schedules.length > 0) {
            // Create schedules for the doctor
            const schedulePromises = schedules.map(async (sched) => {
                const { specializationId, date, startTime, endTime } = sched;
                const specialization = await Specialization.findById(specializationId);

                if (!specialization) {
                    throw new Error(`Specialization not found with ID: ${specializationId}`);
                }

                const newSchedule = new Schedule({
                    doctor: pendingDoctor._id,
                    specialization: specializationId,
                    date,
                    startTime,
                    endTime,
                });

                await newSchedule.save();
                pendingDoctor.schedules.push(newSchedule._id);
            });

            // Save the schedules
            await Promise.all(schedulePromises);
        }

        // Save the doctor
        await pendingDoctor.save();

        // Mark the invitation as used
        invitation.isInvitationUsed = true;
        await invitation.save();

        // Delete the invitation after successful registration
        await Invitation.deleteOne({ _id: invitation._id });

        // Send an email to the admin to verify the registration
        const adminEmail = process.env.ADMIN_EMAIL;
        const subject = 'New Doctor Registration Needs Verification';
        const html = `<p>A new doctor has registered with the email ${invitation.email}. Please verify the registration by visiting the verification page and approving their account.</p>`;
        
        await sendEmail(adminEmail, subject, html);

        res.status(201).json({ msg: 'Doctor registered successfully. Admin will verify the registration.' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};


// Function to update doctor personal information
const updateDoctorDetails = async (req, res) => {
    // Extract the token from the request headers
    const token = req.headers.authorization.split(' ')[1];
    // Destructure the request body properties
    const { name, professionalInfo, currentPassword, newPassword } = req.body;

    try {
        // Verify the token and decode the user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Find the doctor by ID
        const doctor = await Doctor.findById(decoded.userId);
        if (!doctor) {
            return res.status(400).send('Invalid token');
        }

        // Check if the current password and new password are provided
        if (currentPassword && newPassword) {
            // Compare the current password with the stored password
            const isMatch = await bcrypt.compare(currentPassword, doctor.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Current password is incorrect' });
            }

            // Generate a salt for password hashing
            const salt = await bcrypt.genSalt(10);
            // Hash the new password with the generated salt
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            // Update the password and mustChangePassword flag
            doctor.password = hashedPassword;
            doctor.mustChangePassword = false;
        }

        // Update the doctor's personal information if provided
        if (name) doctor.name = name;
        if (professionalInfo) doctor.professionalInfo = professionalInfo;
        if (schedule) doctor.schedule = schedule;

        // Update profile picture if a new one is uploaded
        if (req.file) {
            doctor.profilePicture = req.file.path;
        }

        // Save the updated doctor details to the database
        await doctor.save();
        // Send success message to the client
        res.send('Doctor details updated successfully');
    } catch (error) {
        // Log the error and send an error response to the client
        console.log('Error updating doctor details:', error);
        console.log('Error updating doctor details:', error); // Log the error
        res.status(400).send('Error updating doctor details');
    }
};


const manageSchedules = async (req, res) => {
    const { method } = req;

    switch (method) {
        case 'POST': // Create a new schedule
            try {
                const { doctorId, specializationId, day, startTime, endTime } = req.body;

                const doctor = await Doctor.findById(doctorId);
                if (!doctor) {
                    return res.status(404).json({ msg: 'Doctor not found' });
                }

                const specialization = await Specialization.findById(specializationId);
                if (!specialization) {
                    return res.status(404).json({ msg: 'Specialization not found' });
                }

                const schedule = new Schedule({
                    doctor: doctor._id,
                    specialization: specialization._id,
                    date,
                    startTime,
                    endTime
                });

                await schedule.save();

                // Optionally, add schedule to doctor's schedules array
                doctor.schedules.push(schedule._id);
                await doctor.save();

                return res.status(201).json({ msg: 'Schedule added successfully', schedule });
            } catch (error) {
                return res.status(500).json({ msg: 'Error adding schedule', error: error.message });
            }

        case 'GET': // Retrieve schedules
            try {
                const { doctorId } = req.query;
                const filter = doctorId ? { doctor: doctorId } : {};

                const schedules = await Schedule.find(filter).populate('doctor').populate('specialization');
                return res.status(200).json(schedules);
            } catch (error) {
                return res.status(500).json({ msg: 'Error retrieving schedules', error: error.message });
            }

        case 'PUT': // Update a schedule
            try {
                const { scheduleId, date, startTime, endTime } = req.body;

                const schedule = await Schedule.findById(scheduleId);
                if (!schedule) {
                    return res.status(404).json({ msg: 'Schedule not found' });
                }

                schedule.date = date || schedule.date;
                schedule.startTime = startTime || schedule.startTime;
                schedule.endTime = endTime || schedule.endTime;

                await schedule.save();
                return res.status(200).json({ msg: 'Schedule updated successfully', schedule });
            } catch (error) {
                return res.status(500).json({ msg: 'Error updating schedule', error: error.message });
            }

        case 'DELETE': // Delete a schedule
            try {
                const { scheduleId } = req.body;

                const schedule = await Schedule.findByIdAndDelete(scheduleId);
                if (!schedule) {
                    return res.status(404).json({ msg: 'Schedule not found' });
                }

                // Optionally, remove schedule from doctor's schedules array
                await Doctor.updateOne(
                    { _id: schedule.doctor },
                    { $pull: { schedules: schedule._id } }
                );

                return res.status(200).json({ msg: 'Schedule deleted successfully' });
            } catch (error) {
                return res.status(500).json({ msg: 'Error deleting schedule', error: error.message });
            }

        default:
            return res.status(405).json({ msg: 'Method not allowed' });
    }
};

module.exports = { registerDoctor, updateDoctorDetails,manageSchedules };
