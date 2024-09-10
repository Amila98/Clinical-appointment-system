// controllers/adminController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const sendEmail = require('../utils/sendEmail');
const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const Staff = require('../models/Staff');
const Patient = require('../models/Patient');
const Specialization = require('../models/Specialization');
const Appointment = require('../models/Appointment');
const PendingDoctor = require('../models/PendingDoctor');
const Invitation = require('../models/Invitation');


// Function to send an invitation email to a doctor
const sendDoctorInvitation = async (req, res) => {
    const { email } = req.body;

    // Function to validate email format
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Check if the email is valid
    if (!isValidEmail(email)) {
        return res.status(400).json({ msg: 'Invalid email format' });
    }

    try {
        // Check if a doctor with the given email already exists
        const existingDoctor = await Doctor.findOne({ email });

        if (existingDoctor) {
            return res.status(400).json({ msg: 'Doctor with this email already exists' });
        }

        // Generate a token with the doctor's email
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Create a URL with the token
        const invitationLink = `http://localhost:3001/api/doctor/register/${token}`;

        // Send the invitation email
        let transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Doctor Registration Invitation',
            text: `Please register using the following link: ${invitationLink}`,
        };

        await transporter.sendMail(mailOptions);

        // Save the invitation data
        await Invitation.create({
            email: email,
            invitationToken: token,
            isInvitationUsed: false
        });

        res.status(200).json({ msg: 'Invitation sent successfully' });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


const verifyDoctor = async (req, res) => {
    const { doctorId } = req.body;

    try {
        // Find the pending doctor by ID
        const pendingDoctor = await PendingDoctor.findById(doctorId);
        if (!pendingDoctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        // Create a new doctor record with all necessary fields
        const newDoctor = new Doctor({
            name: pendingDoctor.name,
            email: pendingDoctor.email,
            password: pendingDoctor.password, // Ensure password is transferred
            professionalInfo: pendingDoctor.professionalInfo,
            specializations: pendingDoctor.specializations, // Use the specializations array with schedules
            isVerified: true,
            mustChangePassword: true,
        });

        // Save the new doctor record
        await newDoctor.save();

        // Delete the pending doctor record
        await PendingDoctor.findByIdAndDelete(doctorId);

        // Send verification email to doctor
        let transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: newDoctor.email,
            subject: 'Your Account has been Verified',
            text: `Dear Dr. ${newDoctor.name},\n\nYour account has been successfully verified. You can now log in using your existing credentials and change your password upon first login.\n\nBest regards,\nYour Company`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ msg: 'Doctor verified successfully, email sent' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Function to create a new staff member
const createStaffMember = async (req, res) => {
    const { firstName, lastName, dateOfBirth, gender, email, phoneNumber, address, emergencyContactName, emergencyContactPhone } = req.body;

    try {
        // Check if staff member already exists
        const existingStaff = await Staff.findOne({ email });
        if (existingStaff) {
            return res.status(400).json({ msg: 'Staff member already exists' });
        }

        // Create new staff member
        const newStaff = new Staff({
            firstName,
            lastName,
            dateOfBirth,
            gender,
            email,
            phoneNumber,
            address,
            emergencyContactName,
            emergencyContactPhone,
            isVerified: false,
            mustChangePassword: false,
        });

        // Save new staff member to the database
        await newStaff.save();

        // Generate JWT token for verification
        const token = jwt.sign({ userId: newStaff._id, role: 'staff' }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Create verification link
        const verificationLink = `http://localhost:3000/api/staff/verify/${token}`;

        // Configure email transport
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Staff Account Created - Verification Required',
            text: `Dear ${firstName} ${lastName},\n\nYour staff account has been created. Please use the following link to verify your account and set your password:\n\nVerification Link: ${verificationLink}\n\nBest regards,\nYour Company`,
        };

        // Send verification email
        await transporter.sendMail(mailOptions);

        // Respond with success message
        res.status(201).json({ msg: 'Staff member created and verification email sent' });
    } catch (err) {
        // Handle errors
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};



// Controller function for changing user email
const changeUserEmail = async (req, res) => {
    const { userId } = req.params;
    const { newEmail } = req.body;

    try {
        let user = await Admin.findById(userId) ||
                   await Staff.findById(userId) ||
                   await Doctor.findById(userId) ||
                   await Patient.findById(userId);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const oldEmail = user.email;

        // Check if the user is a doctor and handle accordingly
        if (user instanceof Doctor) {
            user.email = newEmail;
            user.isVerified = false; // Reset verification status
            await user.save();

            // Notify the admin to verify the new email
            const adminEmail = process.env.ADMIN_EMAIL;
            const subject = 'Doctor Email Change Requires Verification';
            const html = `
                <p>Doctor ${user.name} has changed their email to ${newEmail}. Please verify the new email address.</p>
            `;
            await sendEmail(adminEmail, subject, html);

            // Send a notification to the old email
            const notificationMessage = `<p>Your email has been changed from ${oldEmail} to ${newEmail}. The new email requires verification by the admin.</p>`;
            await sendEmail(oldEmail, 'Email Changed', notificationMessage);

            // Send a verification link to the new email (to inform the doctor that verification is required)
            const verificationMessage = `<p>Your email change to ${newEmail} requires admin verification. You will be notified once it's verified.</p>`;
            await sendEmail(newEmail, 'Email Change Pending Verification', verificationMessage);

            return res.status(200).json({ msg: 'Email changed successfully. Admin will verify the new email.' });
        }

        // For other roles, proceed as before
        user.email = newEmail;
        user.isVerified = false;
        user.mustChangePassword = true; // Reset verification status
        await user.save();

        // Send notification to the old email
        const notificationMessage = `<p>Your email has been changed from ${oldEmail} to ${newEmail}.</p>`;
        await sendEmail(oldEmail, 'Email Changed', notificationMessage);

        // Send a verification link to the new email
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const verificationLink = `http://localhost:3000/api/auth/verify/${token}`;
        const verificationMessage = `<p>Please verify your new email address by clicking the link: <a href="${verificationLink}">${verificationLink}</a></p>`;
        await sendEmail(newEmail, 'Verify your new email', verificationMessage);

        res.status(200).json({ msg: 'Email changed successfully. Verification link sent to the new email.' });
    } catch (err) {
        console.error('Error changing email:', err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

const manageSpecializations = async (req, res) => {
    try {
        const { method } = req; // Get id from request params

        switch (method) {
            case 'POST': { // Create a new specialization
                const { name, description } = req.body;

                const existingSpec = await Specialization.findOne({ name });
                if (existingSpec) {
                    return res.status(400).json({ msg: 'Specialization already exists' });
                }

                const specialization = new Specialization({ name, description });
                await specialization.save();
                return res.status(201).json(specialization);
            }
            case 'GET': { // Get all specializations
                const specializations = await Specialization.find();
                return res.status(200).json(specializations);
            }
            case 'PUT': { // Update an existing specialization
                const { name, description } = req.body;

                const specialization = await Specialization.findById(id);
                if (!specialization) {
                    return res.status(404).json({ msg: 'Specialization not found' });
                }

                specialization.name = name || specialization.name;
                specialization.description = description || specialization.description;
                await specialization.save();

                return res.status(200).json(specialization);
            }
            case 'DELETE': { // Delete a specialization
                const { id } = req.params; // Get the ID from the URL parameters

                const specialization = await Specialization.findById(id);
                if (!specialization) {
                    return res.status(404).json({ msg: 'Specialization not found' });
                }

                await Specialization.findByIdAndDelete(id);
                return res.status(200).json({ msg: 'Specialization deleted' });
            }
            default: {
                return res.status(405).json({ msg: 'Method not allowed' });
            }
        }
    } catch (error) {
        res.status(500).json({ msg: 'Error processing request', error });
    }
};



  
module.exports = { sendDoctorInvitation, verifyDoctor, createStaffMember, 
 changeUserEmail, manageSpecializations };
