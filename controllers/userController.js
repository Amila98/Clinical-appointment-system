const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Staff = require('../models/Staff');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');


const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user across all roles by email
        const user = await Admin.findOne({ email }) ||
                     await Doctor.findOne({ email }) ||
                     await Patient.findOne({ email }) ||
                     await Staff.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Check if the user is verified (only for non-admin roles)
        if (!(user instanceof Admin) && !user.isVerified) {
            return res.status(403).json({ msg: 'Account not verified. Please complete the verification process.' });
        }

        // Compare the provided password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Determine the user role for the token
        const role = user.role;

        // If the user must change their password (and is not a patient)
        if (user.mustChangePassword && role !== 'patient') {
            const token = jwt.sign({ userId: user._id, role }, process.env.JWT_SECRET, { expiresIn: '1d' });
            return res.status(200).json({ msg: 'Password change required', mustChangePassword: true, token });
        }

        // Generate the token
        const token = jwt.sign({ userId: user._id, role, isVerified: user.isVerified }, process.env.JWT_SECRET, { expiresIn: '1d' });

        return res.status(200).json({ token });

    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

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


const getUserById = async (req, res) => {
    try {
        // Destructure role and id from request parameters
        const { role, id } = req.params;
        let user;

        // Check role and find user document from respective model
        if (role === 'Admin') {
            user = await Admin.findById(id);
        } else if (role === 'Staff') {
            user = await Staff.findById(id);
        } else if (role === 'Doctor') {
            user = await Doctor.findById(id);
        } else {
            // Return error response if role is invalid
            return res.status(400).json({ msg: 'Invalid role' });
        }

        // Return error response if user is not found
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Return user document as JSON response
        res.status(200).json(user);
    } catch (error) {
        // Log and return error response if an error occurs
        console.error('Error getting user:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};

/**
 * Update user by role and ID
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @returns {Promise<void>} - A promise that resolves when the function completes
 */
const updateUser = async (req, res) => {
    try {
        // Destructure role and id from request parameters
        const { role, id } = req.params;
        // Destructure updates from request body
        const updates = req.body;
        let user;

        // Find user document from respective model based on role
        if (role === 'Admin') {
            user = await Admin.findById(id);
        } else if (role === 'Staff') {
            user = await Staff.findById(id);
        } else if (role === 'Doctor') {
            user = await Doctor.findById(id);
        } else {
            // Return error response if role is invalid
            return res.status(400).json({ msg: 'Invalid role' });
        }

        // Return error response if user is not found
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Update user fields from updates
        Object.keys(updates).forEach(key => {
            if (user[key] !== undefined) {
                user[key] = updates[key];
            }
        });

        // Save the updated user document
        await user.save();

        // Return success response with updated user document
        res.status(200).json({ msg: `${role} updated successfully`, user });
    } catch (error) {
        // Log and return error response if an error occurs
        console.error('Error updating user:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


const deleteUser = async (req, res) => {
    try {
        // Destructure role and id from request parameters
        const { role, id } = req.params;
        let result;

        // Find user document from respective model based on role and delete it
        if (role === 'Admin') {
            result = await Admin.findByIdAndDelete(id);
        } else if (role === 'Staff') {
            result = await Staff.findByIdAndDelete(id);
        } else if (role === 'Doctor') {
            result = await Doctor.findByIdAndDelete(id);
        } else {
            // Return error response if role is invalid
            return res.status(400).json({ msg: 'Invalid role' });
        }

        // Return error response if user is not found
        if (!result) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Return success response with the deleted user's role
        res.status(200).json({ msg: `${role} deleted successfully` });
    } catch (error) {
        // Log and return error response if an error occurs
        console.error('Error deleting user:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


module.exports = { loginUser, createUser, getUserById, updateUser, deleteUser };
