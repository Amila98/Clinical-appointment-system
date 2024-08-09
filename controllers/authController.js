const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const Staff = require('../models/Staff');
const Patient = require('../models/Patient');


const forgotPassword = async (req, res) => {
    // Destructure email and role from request body
    const { email, role } = req.body;

    try {
        let user;

        // Find user based on role and email
        switch (role) {
            case 'admin':
                user = await Admin.findOne({ email });
                break;
            case 'doctor':
                user = await Doctor.findOne({ email });
                break;
            case 'staff':
                user = await Staff.findOne({ email });
                break;
            case 'patient':
                user = await Patient.findOne({ email });
                break;
            // Return error if role is invalid
            default:
                return res.status(400).json({ msg: 'Invalid role' });
        }

        // Return error if user is not found
        if (!user) {
            return res.status(404).json({ msg: 'Email not found' });
        }

        // Generate password reset token
        const token = jwt.sign(
            { userId: user._id, role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Create password reset link
        const resetLink = `http://localhost:3000/reset-password/${token}`;

        // Create transporter for sending email
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Create mail options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset',
            text: `Please reset your password using the following link: ${resetLink}`
        };

        // Send email with password reset link
        await transporter.sendMail(mailOptions);

        // Return success message
        res.status(200).json({ msg: 'Password reset link sent' });
    } catch (error) {
        // Return server error message
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


// Reset Password
const resetPassword = async (req, res) => {
    // Extract token and new password from request parameters and body
    const { token } = req.params;
    const { newPassword } = req.body;

    // Check if token is provided
    if (!token) {
        return res.status(400).json({ msg: 'No token provided' });
    }

    try {
        // Verify token and extract userId and role
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { userId, role } = decoded;

        // Find user based on role and userId
        let user;
        switch (role) {
            case 'admin':
                user = await Admin.findById(userId);
                break;
            case 'doctor':
                user = await Doctor.findById(userId);
                break;
            case 'staff':
                user = await Staff.findById(userId);
                break;
            case 'patient':
                user = await Patient.findById(userId);
                break;
            default:
                return res.status(400).json({ msg: 'Invalid role' });
        }

        // Check if user is found
        if (!user) {
            return res.status(400).json({ msg: 'Invalid token' });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user record
        user.password = hashedPassword;
        user.mustChangePassword = false; // Set mustChangePassword to false
        await user.save(); // Save changes to user record
        user.mustChangePassword = false;
        await user.save();

        // Return success message
        res.status(200).json({ msg: 'Password changed successfully' });
    } catch (error) {
        // Return error message if password change fails
        res.status(400).json({ msg: 'Error changing password', error: error.message });
    }
};


module.exports = { forgotPassword, resetPassword };
