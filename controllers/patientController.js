const Patient = require('../models/Patient');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registerPatient = async (req, res) => {
  const { 
    firstName, 
    lastName, 
    email, 
    phoneNumber, 
    dob, 
    gender, 
    address, 
    city, 
    state, 
    zipCode, 
    medicalHistory, 
    currentMedications, 
    allergies, 
    emergencyContactName, 
    emergencyContactPhone, 
    emergencyAddress, 
    emergencyRelationship, 
    username, 
    password, 
    confirmPassword, 
    medicalFiles 
  } = req.body;

  try {
    // Check if the patient already exists
    let patient = await Patient.findOne({ email });

    if (patient) {
      return res.status(400).json({ 
        success: false, 
        msg: 'User already exists' 
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Passwords do not match' 
      });
    }

    // Create a new patient object with the additional fields
    patient = new Patient({
      firstName,
      lastName,
      email,
      phoneNumber,
      dob,
      gender,
      address,
      city,
      state,
      zipCode,
      medicalHistory,
      currentMedications,
      allergies,
      emergencyContactName,
      emergencyContactPhone,
      emergencyAddress,
      emergencyRelationship,
      username,
      password,
      medicalFiles,
      role: 'patient',
      isVerified: false,
    });

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    patient.password = await bcrypt.hash(password, salt);

    // Save the patient to the database
    await patient.save();

    // Generate JWT token for verification
    const token = jwt.sign(
      { userId: patient._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    // Generate the verification link
    const verificationLink = `http://localhost:3000/api/auth/verify/${token}`;
    const message = `<h1>Email Verification</h1>
                     <p>Please click the following link to verify your email:</p>
                     <a href="${verificationLink}">${verificationLink}</a>`;

    // Send the verification email
    await sendEmail(patient.email, 'Verify your email', message);

    // Return a success response
    res.status(200).json({ 
      success: true, 
      msg: 'Registration successful, please verify your email' 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error', 
      error: err.message 
    });
  }
};

// Route to handle email verification
const verify = async (req, res) => {
  // Extract the token from the request parameters
  const { token } = req.params;

  try {
    // Verify the token and extract the user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Find the patient with the corresponding user ID
    const patient = await Patient.findById(userId);

    // If no patient is found, return an error response
    if (!patient) {
      return res.status(400).json({ msg: 'Invalid token' });
    }

    // Set the patient's verification status to true
    patient.isVerified = true;
    // Save the updated patient to the database
    await patient.save();

    // Return a success response
    res.status(200).json({ msg: 'Email successfully verified' });
  } catch (err) {
    // Log the error and return an error response
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};



// Request password reset
const requestPasswordReset = async (req, res) => {
  // Destructure the email from the request body
  const { email } = req.body;

  try {
    // Find the patient with the provided email
    const patient = await Patient.findOne({ email, role: 'patient' });

    // If patient does not exist, return an error message
    if (!patient) {
      return res.status(400).json({ msg: 'User with this email does not exist' });
    }

    // Generate reset token
    const resetToken = jwt.sign({ userId: patient._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Generate reset link
    const resetLink = `http://localhost:3000/api/patient/reset-password/${resetToken}`;

    // Create reset password email message
    const message = `<h1>Password Reset</h1>
                     <p>Please click the following link to reset your password:</p>
                     <a href="${resetLink}">${resetLink}</a>`;

    // Send reset password email to the patient
    await sendEmail(patient.email, 'Reset your password', message);

    // Return success message
    res.status(200).json({ msg: 'Password reset email sent' });
  } catch (err) {
    // Log the error and return a server error message
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};


// Reset password
const resetPassword = async (req, res) => {
  // Destructure the token and new password from the request parameters and body
  const { token } = req.params;
  const { newPassword } = req.body;

  // Check if token and new password are provided
  if (!token || !newPassword) {
    return res.status(400).json({ msg: 'Token and new password are required' });
  }

  try {
    // Verify the token and extract the user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // If user ID is not found, return an error response
    if (!userId) {
      return res.status(400).json({ msg: 'Invalid token' });
    }

    // Find the patient with the corresponding user ID
    const patient = await Patient.findById(userId);

    // If patient is not found, return an error response
    if (!patient) {
      return res.status(400).json({ msg: 'User not found' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    patient.password = await bcrypt.hash(newPassword, salt);

    // Save the updated patient to the database
    await patient.save();

    // Return a success response
    res.status(200).json({ msg: 'Password reset successfully' });
  } catch (err) {
    // Log the error and return a server error message
    console.error('Error:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};


module.exports = {
  registerPatient,
  verify,
  requestPasswordReset,
  resetPassword
};
