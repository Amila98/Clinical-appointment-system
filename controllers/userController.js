const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Staff = require('../models/Staff');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

const createUser = async (req, res) => {
    try {
        const { username, password, email, role, name, schedule, professionalInfo } = req.body;

        // Get the role of the user making the request from the decoded JWT
        const requesterRole = req.user.role;

        // Ensure all required fields are provided
        if (!username || !password || !email || !role) {
            return res.status(400).json({ msg: 'Missing required fields' });
        }

        // Check if the user is trying to create a Super Admin
        if (role === 'Super Admin') {
            return res.status(403).json({ msg: 'Cannot create Super Admin through this route' });
        }

        // Ensure only Super Admins can create Admins
        if (role === 'Admin' && requesterRole !== 'Super Admin') {
            return res.status(403).json({ msg: 'Only Super Admins can create Admins' });
        }

        // Generate a salt and hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let user;

        // Determine the model to use based on the role of the user
        if (role === 'Admin') {
            // Create a new Admin document
            user = new Admin({
                username,
                password: hashedPassword,
                email,
                role,
                mustChangePassword: true,
                isVerified: true
            });
        } else if (role === 'Staff') {
            if (!name) {
                return res.status(400).json({ msg: 'Missing required fields: name is required for Staff' });
            }

            // Create a new Staff document
            user = new Staff({
                name, // Use 'name' field from request
                username,
                password: hashedPassword,
                email,
                role,
                mustChangePassword: true,
                isVerified: false
            });
        } else if (role === 'Doctor') {
            if (!name || !schedule || !professionalInfo) {
                return res.status(400).json({ msg: 'Missing required fields: name, schedule, and professionalInfo are required for Doctor' });
            }

            // Create a new Doctor document
            user = new Doctor({
                name, // Use 'name' field from request
                username,
                password: hashedPassword,
                email,
                role,
                schedule, // Include schedule
                professionalInfo, // Include professionalInfo
                mustChangePassword: true,
                isVerified: false
            });
        } else {
            return res.status(400).json({ msg: 'Invalid role' });
        }

        // Save the user document to the database
        await user.save();
        res.status(201).json({ msg: `${role} created successfully` });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// Get user by role and ID
const getUserById = async (req, res) => {
    try {
        const { role, id } = req.params;
        let user;

        if (role === 'Admin') {
            user = await Admin.findById(id);
        } else if (role === 'Staff') {
            user = await Staff.findById(id);
        } else if (role === 'Doctor') {
            user = await Doctor.findById(id);
        } else {
            return res.status(400).json({ msg: 'Invalid role' });
        }

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// Update user by role and ID
const updateUser = async (req, res) => {
    try {
        const { role, id } = req.params;
        const updates = req.body;
        let user;

        if (role === 'Admin') {
            user = await Admin.findById(id);
        } else if (role === 'Staff') {
            user = await Staff.findById(id);
        } else if (role === 'Doctor') {
            user = await Doctor.findById(id);
        } else {
            return res.status(400).json({ msg: 'Invalid role' });
        }

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Update user fields
        Object.keys(updates).forEach(key => {
            if (user[key] !== undefined) {
                user[key] = updates[key];
            }
        });

        await user.save();
        res.status(200).json({ msg: `${role} updated successfully`, user });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

// Delete user by role and ID
const deleteUser = async (req, res) => {
    try {
        const { role, id } = req.params;
        let result;

        if (role === 'Admin') {
            result = await Admin.findByIdAndDelete(id);
        } else if (role === 'Staff') {
            result = await Staff.findByIdAndDelete(id);
        } else if (role === 'Doctor') {
            result = await Doctor.findByIdAndDelete(id);
        } else {
            return res.status(400).json({ msg: 'Invalid role' });
        }

        if (!result) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.status(200).json({ msg: `${role} deleted successfully` });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


module.exports = { createUser, getUserById, updateUser, deleteUser };
