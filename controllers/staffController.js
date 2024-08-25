const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Staff = require('../models/Staff');

// Staff login function
// Function for staff login

const verifyStaff = async (req, res) => {
    // Destructure the token and password from the request body
    const { token } = req.params;
    const { password } = req.body;

    try {
        // Decode the token using the JWT secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the staff member by their ID
        const staff = await Staff.findById(decoded.userId);

        // If the staff member does not exist or is already verified, return an error
        if (!staff || staff.isVerified) {
            return res.status(400).json({ msg: 'Invalid token' });
        }

        // Generate a salt and hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update the staff member's password and verification status
        staff.password = hashedPassword;
        staff.isVerified = true;
        staff.mustChangePassword = true;

        // Save the changes to the staff member
        await staff.save();

        // Return a success message
        res.status(200).json({ msg: 'Staff member verified and password set successfully' });
    } catch (err) {
        // Return an error message if there was a server error
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};



const changePassword = async (req, res) => {
    // Extract the token and new password from the request
    const token = req.headers.authorization.split(' ')[1];
    const { newPassword } = req.body;

    try {
        // Verify the token and extract the staff ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const staffId = decoded.id;

        // If the staff member does not exist, return an error
        const staff = await Staff.findById(decoded.id);
        if (!staff) {
            return res.status(400).send('Invalid token');
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the staff record
        // Update staff record
        staff.password = hashedPassword;
        staff.mustChangePassword = false; // No longer needs to change password
        await staff.save();

        // Return success message
        res.send('Password changed successfully');
    } catch (error) {
        // Return error message if there was a problem changing the password
        res.status(400).send('Error changing password');
    }
};



const viewStaffDetails = async (req, res) => {
    // Extract the token from the request headers
    const token = req.headers.authorization.split(' ')[1];

    try {
        // Verify the token and decode the staff ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the staff member by ID, excluding the password field
        const staff = await Staff.findById(decoded.id).select('-password');

        // If staff member is not found, return a 404 error response
        if (!staff) {
            return res.status(404).json({ msg: 'Staff not found' });
        }

        // Return the staff object with password excluded
        res.status(200).json(staff);
    } catch (err) {
        // Log the error and return a server error message
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Function to update staff personal information
const updateStaffDetails = async (req, res) => {
    // Extract the authorization token from the request headers
    const token = req.headers.authorization.split(' ')[1];
    // Destructure the request body properties
    const { name, contact, newPassword } = req.body;

    try {
        // Verify the token and decode the staff ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Find the staff member by ID
        const staff = await Staff.findById(decoded.id);
        if (!staff) {
            // Return an error if the token is invalid
            return res.status(400).send('Invalid token');
        }

        // Update staff details, excluding email
        if (name) staff.name = name;
        if (contact) staff.contact = contact;

        // Update password if provided
        if (newPassword) {
            // Generate a salt for password hashing
            const salt = await bcrypt.genSalt(10);
            // Hash the new password with the generated salt
            staff.password = await bcrypt.hash(newPassword, salt);
        }

        if (req.file) {
            staff.profilePicture = req.file.path;
        }

        // Save the updated staff details to the database
        await staff.save();
        // Send success message to the client
        res.send('Staff details updated successfully');
    } catch (error) {
        // Log the error and send an error response to the client
        console.log('Error updating staff details:', error);
        console.log('Error updating staff details:', error); // Log the error
        res.status(400).send('Error updating staff details');
    }
};


module.exports = { verifyStaff, changePassword,viewStaffDetails, updateStaffDetails };
