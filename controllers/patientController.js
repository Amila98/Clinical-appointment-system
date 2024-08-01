const Patient = require('../models/Patient');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register function for patients
const registerPatient = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let patient = await Patient.findOne({ email });

    if (patient) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    patient = new Patient({
      name,
      email,
      password,
      role: 'patient',
      isVerified: false,
    });

    const salt = await bcrypt.genSalt(10);
    patient.password = await bcrypt.hash(password, salt);

    await patient.save();

    // Generate JWT token for verification
    const token = jwt.sign({ userId: patient._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const verificationLink = `http://localhost:3000/api/auth/verify/${token}`;
    const message = `<h1>Email Verification</h1>
                     <p>Please click the following link to verify your email:</p>
                     <a href="${verificationLink}">${verificationLink}</a>`;

    await sendEmail(patient.email, 'Verify your email', message);

    res.status(200).json({ msg: 'Registration successful, please verify your email' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Route to handle email verification
const verify = async (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const patient = await Patient.findById(userId);

    if (!patient) {
      return res.status(400).json({ msg: 'Invalid token' });
    }

    patient.isVerified = true;
    await patient.save();

    res.status(200).json({ msg: 'Email successfully verified' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Generic login function for all roles
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const patient = await Patient.findOne({ email });
    if (!patient) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, patient.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: patient._id, role: patient.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const patient = await Patient.findOne({ email, role: 'patient' });
    if (!patient) {
      return res.status(400).json({ msg: 'User with this email does not exist' });
    }

    // Generate reset token
    const resetToken = jwt.sign({ userId: patient._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const resetLink = `http://localhost:3000/api/patient/reset-password/${resetToken}`;
    const message = `<h1>Password Reset</h1>
                     <p>Please click the following link to reset your password:</p>
                     <a href="${resetLink}">${resetLink}</a>`;

    await sendEmail(patient.email, 'Reset your password', message);

    res.status(200).json({ msg: 'Password reset email sent' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ msg: 'Token and new password are required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    if (!userId) {
      return res.status(400).json({ msg: 'Invalid token' });
    }

    const patient = await Patient.findById(userId);
    if (!patient) {
      return res.status(400).json({ msg: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    patient.password = await bcrypt.hash(newPassword, salt);
    await patient.save();

    res.status(200).json({ msg: 'Password reset successfully' });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Function to view patient personal information
const viewPatientDetails = async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const patient = await Patient.findById(decoded.userId).select('-password');
    if (!patient) {
      return res.status(404).json({ msg: 'Patient not found' });
    }

    res.status(200).json(patient);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Function to update patient personal information
const updatePatientDetails = async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const { name, currentPassword, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const patient = await Patient.findById(decoded.userId);
    if (!patient) {
      return res.status(400).send('Invalid token');
    }

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, patient.password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Current password is incorrect' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      patient.password = hashedPassword;
      patient.mustChangePassword = false;
    }

    if (name) patient.name = name;

    await patient.save();
    res.send('Patient details updated successfully');
  } catch (error) {
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
