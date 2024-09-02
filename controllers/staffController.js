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





module.exports = { verifyStaff };
