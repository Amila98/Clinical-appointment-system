// controllers/doctorController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const sendEmail = require('../utils/sendEmail');
const Doctor = require('../models/Doctor');
const Specialization = require('../models/Specialization');
const PendingDoctor = require('../models/PendingDoctor');
const Invitation = require('../models/Invitation');

const registerDoctor = async (req, res) => {
    const { name, password, professionalInfo, specializations } = req.body;
    const { token } = req.params;

    try {
        // Find the invitation with the given token
        const invitation = await Invitation.findOne({ invitationToken: token });

        if (!invitation || invitation.isInvitationUsed) {
            return res.status(400).json({ msg: 'Invalid or expired token.' });
        }

        // Check if the invitation has expired (24-hour expiry check)
        if (invitation.expiresAt < new Date()) {
            return res.status(400).json({ msg: 'Invitation token has expired.' });
        }

        // Hash the doctor's password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Prepare the specializations array
        let specializationsWithSchedules = [];

        if (specializations && specializations.length > 0) {
            specializationsWithSchedules = await Promise.all(specializations.map(async (spec) => {
                const { specializationId, schedules } = spec;

                // Check if the specialization exists
                const specialization = await Specialization.findById(specializationId);
                if (!specialization) {
                    throw new Error(`Specialization not found with ID: ${specializationId}`);
                }

                // Prepare schedules and divide time into slots
                const createdSchedules = schedules.map(sched => {
                    const { day, startTime, endTime, appointmentTimeLimit } = sched;
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

                    return {
                        day,
                        startTime,
                        endTime,
                        appointmentTimeLimit: appointmentLimit,
                        maxAppointments: numSlots,
                        appointmentSlots: appointmentSlots // This stores the generated slots
                    };
                });

                return {
                    specializationId,
                    schedules: createdSchedules
                };
            }));
        }

        // Create a new pending doctor with the given information
        const pendingDoctor = new PendingDoctor({
            name,
            email: invitation.email, // Use the email from the invitation
            password: hashedPassword,
            professionalInfo,
            specializations: specializationsWithSchedules, // Include specializations with schedules
            appointmentCount: 0 // Initialize appointment count to 0
        });

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



module.exports = { registerDoctor, updateDoctorDetails };
