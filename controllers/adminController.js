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




const changeAdminPassword = async (req, res) => {
    // Destructure the new password from the request body
    const { newPassword } = req.body;

    // Get the admin ID from the request user object
    const adminId = req.user.userId;

    try {
        // Generate a salt for password hashing
        const salt = await bcrypt.genSalt(10);

        // Hash the new password with the generated salt
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Find the admin by ID and update the password and mustChangePassword flag
        await Admin.findByIdAndUpdate(adminId, { password: hashedPassword, mustChangePassword: false });

        // Return success message
        res.status(200).json({ msg: 'Password changed successfully' });
    } catch (err) {
        // Return server error message
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};


// Function to send an invitation email to a doctor
const sendDoctorInvitation = async (req, res) => {
    // Destructure the email from the request body
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
        // Generate a token with the doctor's email
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Create a URL with the token
        const invitationLink = `http://localhost:3000/api/admin/invite-doctor/${token}`;

        // Send the invitation email
        // Create a transporter for sending emails
        let transporter = nodemailer.createTransport({
            service: 'Gmail', // or any other email service
            auth: {
                user: process.env.EMAIL_USER, // email user for sending emails
                pass: process.env.EMAIL_PASS, // email password for sending emails
            },
        });

        // Define the mail options
        let mailOptions = {
            from: process.env.EMAIL_USER, // email address of the sender
            to: email, // email address of the recipient
            subject: 'Doctor Registration Invitation', // subject of the email
            text: `Please register using the following link: ${invitationLink}`, // content of the email
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        // Return success message
        res.status(200).json({ msg: 'Invitation sent successfully' });
    } catch (error) {
        // Return server error message
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// controllers/adminController.js

const verifyDoctor = async (req, res) => {
    const { doctorId } = req.body;

    try {
        const doctor = await Doctor.findById(doctorId);

        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        doctor.isVerified = true;
        await doctor.save();

        // Send verification email to doctor
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: doctor.email,
            subject: 'Your Account has been Verified',
            text: `Dear Dr. ${doctor.name},\n\nYour account has been successfully verified. You can now log in using your existing credentials and change your password upon first login.\n\nBest regards,\nYour Company`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ msg: 'Doctor verified successfully, email sent' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Function to create a new staff member
const createStaffMember = async (req, res) => {
    const { name, email } = req.body;

    try {
        const existingStaff = await Staff.findOne({ email });

        if (existingStaff) {
            return res.status(400).json({ msg: 'Staff member already exists' });
        }

        const newStaff = new Staff({
            name,
            email,
            isVerified: false,
            mustChangePassword: true,
        });

        await newStaff.save();

        const token = jwt.sign({ userId: newStaff._id, role: 'staff' }, process.env.JWT_SECRET, { expiresIn: '1d' });

        const verificationLink = `http://localhost:3000/api/staff/verify/${token}`;

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Staff Account Created - Verification Required',
            text: `Dear ${name},\n\nYour staff account has been created. Please use the following link to verify your account and set your password:\n\nVerification Link: ${verificationLink}\n\nBest regards,\nYour Company`,
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({ msg: 'Staff member created and verification email sent' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};


// Function to view admin personal information
const viewAdminDetails = async (req, res) => {
    // Get the admin ID from the request user object
    const adminId = req.user.userId;

    try {
        // Find the admin by ID and exclude the password field
        const admin = await Admin.findById(adminId).select('-password');

        // If admin does not exist, return an error message
        if (!admin) {
            return res.status(404).json({ msg: 'Admin not found' });
        }

        // Return the admin details
        res.status(200).json(admin);
    } catch (err) {
        // If an error occurs, return a server error message
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};


// Update admin details including profile picture
const updateAdminDetails = async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    const { username, currentPassword, newPassword } = req.body;

    try {
        // Verify the JWT token to get the admin ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.userId);

        // Check if admin exists
        if (!admin) {
            return res.status(400).send('Invalid token');
        }

        // Update password if provided
        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, admin.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Current password is incorrect' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            admin.password = hashedPassword;
        }

        // Update username if provided
        if (username) {
            admin.username = username;
        }

        // Update profile picture if a new one is uploaded
        if (req.file) {
            admin.profilePicture = req.file.path;
        }

        // Save the updated admin details to the database
        await admin.save();

        // Respond with a success message
        res.status(200).json({ msg: 'Admin details updated successfully', admin });
    } catch (error) {
        console.error('Error updating admin details:', error);
        res.status(400).json({ msg: 'Error updating admin details' });
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
        const { method } = req;

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
                const { id, name, description } = req.body;

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
                const { id } = req.body;

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
  

module.exports = { changeAdminPassword, sendDoctorInvitation, verifyDoctor, createStaffMember, viewAdminDetails, updateAdminDetails, changeUserEmail, manageSpecializations };
