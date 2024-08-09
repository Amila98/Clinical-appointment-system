const Patient = require('../models/Patient');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registerPatient = async (req, res) => {
  // Destructure the request body
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    let patient = await Patient.findOne({ email });

    if (patient) {
      // User already exists, return an error response
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Create a new patient object
    patient = new Patient({
      name,
      email,
      password,
      role: 'patient',
      isVerified: false,
    });

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    patient.password = await bcrypt.hash(password, salt);

    // Save the patient to the database
    await patient.save();

    // Generate JWT token for verification
    const token = jwt.sign({ userId: patient._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Generate the verification link
    const verificationLink = `http://localhost:3000/api/auth/verify/${token}`;
    const message = `<h1>Email Verification</h1>
                     <p>Please click the following link to verify your email:</p>
                     <a href="${verificationLink}">${verificationLink}</a>`;

    // Send the verification email
    await sendEmail(patient.email, 'Verify your email', message);

    // Return a success response
    res.status(200).json({ msg: 'Registration successful, please verify your email' });
  } catch (err) {
    // Log the error and return an error response
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
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


const loginUser = async (req, res) => {
  // Destructure email and password from request body
  const { email, password } = req.body;

  try {
    // Find the patient with the provided email
    const patient = await Patient.findOne({ email });

    // If patient does not exist, return an error message
    if (!patient) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Compare the provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, patient.password);

    // If passwords do not match, return an error message
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Generate a token and return it
    const token = jwt.sign({ userId: patient._id, role: patient.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ token });
  } catch (err) {
    // If an error occurs, return a server error message
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

const viewPatientDetails = async (req, res) => {
  // Extract the token from the authorization header
  const token = req.headers.authorization.split(' ')[1];

  try {
    // Verify the token and extract the user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the patient with the corresponding user ID and exclude the password field
    const patient = await Patient.findById(decoded.userId).select('-password');

    // If patient is not found, return a 404 error response
    if (!patient) {
      return res.status(404).json({ msg: 'Patient not found' });
    }

    // Return the patient object with password excluded
    res.status(200).json(patient);
  } catch (err) {
    // Log the error and return a server error message
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};



// Function to update patient personal information
const updatePatientDetails = async (req, res) => {
  // Extract the token from the request headers
  const token = req.headers.authorization.split(' ')[1];
  // Destructure the name, current password, and new password from the request body
  const { name, currentPassword, newPassword } = req.body;

  try {
    // Verify the token and decode the user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Find the patient by ID
    const patient = await Patient.findById(decoded.userId);
    if (!patient) {
      // If patient is not found, return an error response
      return res.status(400).send('Invalid token');
    }

    if (currentPassword && newPassword) {
      // Check if the current password and new password are provided
      const isMatch = await bcrypt.compare(currentPassword, patient.password);
      if (!isMatch) {
        // If current password is incorrect, return an error response
        return res.status(400).json({ msg: 'Current password is incorrect' });
      }

      // Generate a salt for password hashing
      const salt = await bcrypt.genSalt(10);
      // Hash the new password with the generated salt
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      // Update the password and mustChangePassword flag
      patient.password = hashedPassword;
      patient.mustChangePassword = false;
    }

    // Update the patient's personal information if provided
    if (name) patient.name = name;

    // Save the updated patient details to the database
    await patient.save();

    // Send a success response
    res.send('Patient details updated successfully');
  } catch (error) {
    // Log the error and send an error response to the client
    console.log('Error updating patient details:', error); // Log the error
    res.status(400).send('Error updating patient details');
  }
};

module.exports = {
  registerPatient,
  verify,
  loginUser,
  requestPasswordReset,
  resetPassword,
  viewPatientDetails,
  updatePatientDetails
};
