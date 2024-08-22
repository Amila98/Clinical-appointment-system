// controllers/doctorController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const sendEmail = require('../utils/sendEmail');
const Doctor = require('../models/Doctor');
const Specialization = require('../models/Specialization');

const registerDoctor = async (req, res) => {
    const { name, email, password, professionalInfo, schedule, specializations } = req.body;

    try {
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Validate and find the selected specializations
        const selectedSpecializations = await Specialization.find({
            _id: { $in: specializations }
        });

        // Create and save the doctor
        const newDoctor = new Doctor({
            name,
            email,
            password: hashedPassword,
            professionalInfo,
            schedule,
            specializations: selectedSpecializations.map(spec => spec._id), // Reference selected specializations
            isVerified: false,
            mustChangePassword: true,
        });

        await newDoctor.save();

        // Notify admin for verification
        const adminEmail = process.env.ADMIN_EMAIL;

        const subject = 'New Doctor Registration Needs Verification';
        const html = `
            <p>A new doctor has registered with the email ${email}. Please verify the registration by visiting the verification page and approving their account.</p>
        `;

        await sendEmail(adminEmail, subject, html);

        // Return success message
        res.status(201).json({ msg: 'Doctor registered successfully. Admin will verify the registration.' });
    } catch (err) {
        // Return error message
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};



// Controller function to verify doctor account
const changeDoctorPassword = async (req, res) => {
    // Destructure newPassword from the request body
    const { newPassword } = req.body;
    // Get the doctor ID from the request user object
    const doctorId = req.user.userId;
  
    try {
        // Generate a salt for password hashing
        const salt = await bcrypt.genSalt(10);
        // Hash the new password with the generated salt
        const hashedPassword = await bcrypt.hash(newPassword, salt);
  
        // Find the doctor by ID and update the password and mustChangePassword flag
        await Doctor.findByIdAndUpdate(doctorId, { password: hashedPassword, mustChangePassword: false });
  
        // Return success message
        res.status(200).json({ msg: 'Password changed successfully' });
    } catch (err) {
        // Return server error message
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

const viewDoctorDetails = async (req, res) => {
    // Extract the token from the request headers
    const token = req.headers.authorization.split(' ')[1];

    try {
        // Verify the token and decode the user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Find the doctor by ID and exclude the password field from the response
        const doctor = await Doctor.findById(decoded.userId).select('-password');
        // If the doctor is not found, return a 404 error
        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        // Send the doctor details to the client
        res.status(200).json(doctor);
    } catch (err) {
        // If an error occurs, return a 500 error with the error message
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Function to update doctor personal information
const updateDoctorDetails = async (req, res) => {
    // Extract the token from the request headers
    const token = req.headers.authorization.split(' ')[1];
    // Destructure the request body properties
    const { name, professionalInfo, schedule, currentPassword, newPassword } = req.body;

    try {
        // Verify the token and decode the user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Find the doctor by ID
        const doctor = await Doctor.findById(decoded.userId);
        if (!doctor) {
            return res.status(400).send('Invalid token');
        }

        // Check if the current password and new password are provided
        if (currentPassword && newPassword) {
            // Compare the current password with the stored password
            const isMatch = await bcrypt.compare(currentPassword, doctor.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Current password is incorrect' });
            }

            // Generate a salt for password hashing
            const salt = await bcrypt.genSalt(10);
            // Hash the new password with the generated salt
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            // Update the password and mustChangePassword flag
            doctor.password = hashedPassword;
            doctor.mustChangePassword = false;
        }

        // Update the doctor's personal information if provided
        if (name) doctor.name = name;
        if (professionalInfo) doctor.professionalInfo = professionalInfo;
        if (schedule) doctor.schedule = schedule;

        // Update profile picture if a new one is uploaded
        if (req.file) {
            doctor.profilePicture = req.file.path;
        }

        // Save the updated doctor details to the database
        await doctor.save();
        // Send success message to the client
        res.send('Doctor details updated successfully');
    } catch (error) {
        // Log the error and send an error response to the client
        console.log('Error updating doctor details:', error);
        console.log('Error updating doctor details:', error); // Log the error
        res.status(400).send('Error updating doctor details');
    }
};

module.exports = { registerDoctor, changeDoctorPassword, viewDoctorDetails, updateDoctorDetails, };
