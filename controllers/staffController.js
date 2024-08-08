const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Staff = require('../models/Staff');

// Staff login function
// Function for staff login

const verifyStaff = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const staff = await Staff.findById(decoded.userId);

        if (!staff) {
            return res.status(400).json({ msg: 'Invalid token' });
        }

        if (staff.isVerified) {
            return res.status(400).json({ msg: 'Staff member already verified' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        staff.password = hashedPassword;
        staff.isVerified = true;
        staff.mustChangePassword =true;

        await staff.save();

        res.status(200).json({ msg: 'Staff member verified and password set successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

const loginStaff = async (req, res) => {
    const { email, password } = req.body;
    try {
        const staff = await Staff.findOne({ email });
        if (!staff || !staff.isVerified) {
            return res.status(400).send('Invalid email or email not verified');
        }

        const isMatch = await bcrypt.compare(password, staff.password);
        if (!isMatch) {
            return res.status(400).send('Invalid password');
        }

        if (staff.mustChangePassword) {
            // User must change password on first login
            const token = jwt.sign({ id: staff._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            return res.status(200).json({ msg: 'Password change required', token });
        }

        // If no password change is required
        const token = jwt.sign({ id: staff._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.status(200).json({ token });
    } catch (error) {
        res.status(400).send('Error logging in');
    }
};


const changePassword = async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    const { newPassword } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const staff = await Staff.findById(decoded.id);
        if (!staff) {
            return res.status(400).send('Invalid token');
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update staff record
        staff.password = hashedPassword;
        staff.mustChangePassword = false; // No longer needs to change password
        await staff.save();

        res.send('Password changed successfully');
    } catch (error) {
        res.status(400).send('Error changing password');
    }
};



// Function to view staff personal information
const viewStaffDetails = async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const staff = await Staff.findById(decoded.id).select('-password');
        if (!staff) {
            return res.status(404).json({ msg: 'Staff not found' });
        }

        res.status(200).json(staff);
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Function to update staff personal information
const updateStaffDetails = async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    const { name, contact, newPassword } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const staff = await Staff.findById(decoded.id);
        if (!staff) {
            return res.status(400).send('Invalid token');
        }

        // Update staff details, excluding email
        if (name) staff.name = name;
        if (contact) staff.contact = contact;

        // Update password if provided
        if (newPassword) {
            const salt = await bcrypt.genSalt(10);
            staff.password = await bcrypt.hash(newPassword, salt);
        }

        await staff.save();
        res.send('Staff details updated successfully');
    } catch (error) {
        console.log('Error updating staff details:', error); // Log the error
        res.status(400).send('Error updating staff details');
    }
};


module.exports = { verifyStaff, loginStaff, changePassword,viewStaffDetails, updateStaffDetails };
