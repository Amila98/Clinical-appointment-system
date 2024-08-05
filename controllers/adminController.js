// controllers/adminController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const Staff = require('../models/Staff');


// Admin login function
const loginAdmin = async (req, res) => {
    // Destructure the username and password from the request body
    const { username, password } = req.body;

    try {
        // Find the admin with the provided username
        const admin = await Admin.findOne({ username });

        // If admin does not exist, return an error message
        if (!admin) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Compare the provided password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, admin.password);

        // If passwords do not match, return an error message
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // If admin must change password, generate a token and return it along with a message
        if (admin.mustChangePassword) {
            const token = jwt.sign({ userId: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
            return res.status(200).json({ msg: 'Password change required', mustChangePassword: true, token });
        }

        // Generate a token and return it
        const token = jwt.sign({ userId: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
        return res.status(200).json({ token });
    } catch (err) {
        // If an error occurs, return a server error message
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};


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

// Verify doctor function
const verifyDoctor = async (req, res) => {
    // Get the doctor ID from the request body
    const { doctorId } = req.body;

    try {
        // Find the doctor by their ID
        const doctor = await Doctor.findById(doctorId);

        // If doctor not found, return error
        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-8);

        // Generate a salt and hash the temporary password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        // Set the doctor's password to the hashed password
        doctor.password = hashedPassword;

        // Set the doctor's verification status to true
        doctor.isVerified = true;

        // Set the flag to indicate that the doctor must change their password
        doctor.mustChangePassword = true;

        // Save the doctor's changes
        doctor.mustChangePassword = true; // Set the flag
        await doctor.save();

        // Create a transporter for sending emails
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Define the mail options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: doctor.email,
            subject: 'Your Account has been Verified',
            text: `Dear Dr. ${doctor.name},\n\nYour account has been successfully verified. You can now log in using the following credentials:\n\nEmail: ${doctor.email}\nTemporary Password: ${tempPassword}\n\nPlease change your password upon first login.\n\nBest regards,\nYour Company`,
        };

        // Send the verification email
        await transporter.sendMail(mailOptions);

        // Return success message and doctor object
        res.status(200).json({ msg: 'Doctor verified and credentials sent successfully', doctor });
    } catch (err) {
        // Return server error message
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};


// Function to create a new staff member
const createStaffMember = async (req, res) => {
    // Destructure the name and email from the request body
    const { name, email } = req.body;

    try {
        // Check if a staff member with the same email already exists
        const existingStaff = await Staff.findOne({ email });

        if (existingStaff) {
            // Return error if a staff member with the same email already exists
            return res.status(400).json({ msg: 'Staff member already exists' });
        }

        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-8);

        // Generate a salt and hash the temporary password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        // Create a new staff member with the provided name, email, and hashed password
        const newStaff = new Staff({
            name,
            email,
            password: hashedPassword,
        });

        // Save the new staff member to the database
        await newStaff.save();

        // Generate a JWT token for verification
        const token = jwt.sign({ userId: newStaff._id, role: 'staff' }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Create the verification link using the token
        const verificationLink = `http://localhost:3000/api/staff/verify/${token}`;

        // Create a transporter for sending emails
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Define the mail options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Staff Account Created - Verification Required',
            text: `Dear ${name},\n\nYour staff account has been created. Please use the following temporary password to log in and change your password upon first login:\n\nTemporary Password: ${tempPassword}\nVerification Link: ${verificationLink}\n\nBest regards,\nYour Company`,
        };

        // Send the verification email
        await transporter.sendMail(mailOptions);

        // Return success message
        res.status(201).json({ msg: 'Staff member created and verification email sent' });
    } catch (err) {
        // Return server error message
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

// Function to update admin personal information
const updateAdminDetails = async (req, res) => {
    // Get the admin ID from the request user object
    const adminId = req.user.userId;
    // Destructure the username and password from the request body
    const { username, password } = req.body;

    try {
        // Create an object to store the updates
        const updates = {};

        // If username is provided, add it to the updates object
        if (username) updates.username = username;

        // If password is provided, hash it and add it to the updates object
        if (password) {
            // Generate a salt for password hashing
            const salt = await bcrypt.genSalt(10);
            // Hash the password with the generated salt
            updates.password = await bcrypt.hash(password, salt);
        }

        // Find the admin by ID, update the provided fields, and return the updated admin
        const admin = await Admin.findByIdAndUpdate(adminId, updates, { new: true }).select('-password');

        // If admin does not exist, return an error message
        if (!admin) {
            return res.status(404).json({ msg: 'Admin not found' });
        }

        // Return the updated admin details
        res.status(200).json({ msg: 'Admin details updated successfully', admin });
    } catch (err) {
        // Return a server error message if an error occurs
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

module.exports = { loginAdmin, changeAdminPassword, sendDoctorInvitation, verifyDoctor, createStaffMember, viewAdminDetails, updateAdminDetails };
