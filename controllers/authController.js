const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const Staff = require('../models/Staff');
const Patient = require('../models/Patient');

// Forgot Password
const forgotPassword = async (req, res) => {
    const { email, role } = req.body;

    try {
        let user;

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
            default:
                return res.status(400).json({ msg: 'Invalid role' });
        }

        if (!user) {
            return res.status(404).json({ msg: 'Email not found' });
        }

        const token = jwt.sign(
            { userId: user._id, role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const resetLink = `http://localhost:3000/reset-password/${token}`;

        // Send email with reset link
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
            subject: 'Password Reset',
            text: `Please reset your password using the following link: ${resetLink}`
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ msg: 'Password reset link sent' });
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


// Reset Password
const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token) {
        return res.status(400).json({ msg: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { userId, role } = decoded;

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

        if (!user) {
            return res.status(400).json({ msg: 'Invalid token' });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user record
        user.password = hashedPassword;
        user.mustChangePassword = false;
        await user.save();

        res.status(200).json({ msg: 'Password changed successfully' });
    } catch (error) {
        res.status(400).json({ msg: 'Error changing password', error: error.message });
    }
};


module.exports = { forgotPassword, resetPassword };
