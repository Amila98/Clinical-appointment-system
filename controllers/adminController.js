// controllers/adminController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

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

        const token = jwt.sign({ userId: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

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

module.exports = { loginAdmin, changeAdminPassword };
