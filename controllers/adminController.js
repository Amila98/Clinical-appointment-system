// controllers/adminController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const Staff = require('../models/Staff');

// Admin login function
const loginAdmin = async (req, res) => {
    const { username, password } = req.body;

    try {
        const admin = await Admin.findOne({ username });

        if (!admin) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });

        if (admin.mustChangePassword) {
            return res.status(200).json({ msg: 'Password change required', mustChangePassword: true, token });
        }

        res.status(200).json({ token });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Change admin password function
const changeAdminPassword = async (req, res) => {
    const { newPassword } = req.body;
    const adminId = req.user.userId;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await Admin.findByIdAndUpdate(adminId, { password: hashedPassword, mustChangePassword: false });

        res.status(200).json({ msg: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};


const sendDoctorInvitation = async (req, res) => {
    const { email } = req.body;

    try {
        // Generate a token with the doctor's email
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Create a URL with the token
        const invitationLink = `http://localhost:3000/register/doctor/${token}`;

        // Send the invitation email
        let transporter = nodemailer.createTransport({
            service: 'Gmail', // or any other email service
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

        res.status(200).json({ msg: 'Invitation sent successfully' });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// Verify doctor function
const verifyDoctor = async (req, res) => {
    const { doctorId } = req.body;

    try {
        const doctor = await Doctor.findById(doctorId);

        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        const tempPassword = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        doctor.password = hashedPassword;
        doctor.isVerified = true;
        doctor.mustChangePassword = true; // Set the flag
        await doctor.save();

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
            text: `Dear Dr. ${doctor.name},\n\nYour account has been successfully verified. You can now log in using the following credentials:\n\nEmail: ${doctor.email}\nTemporary Password: ${tempPassword}\n\nPlease change your password upon first login.\n\nBest regards,\nYour Company`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ msg: 'Doctor verified and credentials sent successfully', doctor });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

const createStaffMember = async (req, res) => {
    const { name, email } = req.body;

    try {
        const existingStaff = await Staff.findOne({ email });

        if (existingStaff) {
            return res.status(400).json({ msg: 'Staff member already exists' });
        }

        const tempPassword = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        const newStaff = new Staff({
            name,
            email,
            password: hashedPassword,
        });

        await newStaff.save();

        const token = jwt.sign({ userId: newStaff._id, role: 'staff' }, process.env.JWT_SECRET, { expiresIn: '1d' });
        const verificationLink = `http://localhost:3000/api/staff/verify/${token}`; // Updated URL

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
            text: `Dear ${name},\n\nYour staff account has been created. Please use the following temporary password to log in and change your password upon first login:\n\nTemporary Password: ${tempPassword}\nVerification Link: ${verificationLink}\n\nBest regards,\nYour Company`,
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({ msg: 'Staff member created and verification email sent' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Function to view admin personal information
const viewAdminDetails = async (req, res) => {
    const adminId = req.user.userId;

    try {
        const admin = await Admin.findById(adminId).select('-password');
        if (!admin) {
            return res.status(404).json({ msg: 'Admin not found' });
        }

        res.status(200).json(admin);
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Function to update admin personal information
const updateAdminDetails = async (req, res) => {
    const adminId = req.user.userId;
    const { username, password } = req.body;

    try {
        const updates = {};

        if (username) updates.username = username;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(password, salt);
        }

        const admin = await Admin.findByIdAndUpdate(adminId, updates, { new: true }).select('-password');
        if (!admin) {
            return res.status(404).json({ msg: 'Admin not found' });
        }

        res.status(200).json({ msg: 'Admin details updated successfully', admin });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

module.exports = { loginAdmin, changeAdminPassword, sendDoctorInvitation, verifyDoctor, createStaffMember, viewAdminDetails, updateAdminDetails };
