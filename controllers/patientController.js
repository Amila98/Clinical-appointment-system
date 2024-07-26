// controllers/patientController.js
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Patient register function
const registerPatient = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
      name,
      email,
      password,
      role: 'patient',
      verified: false,
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Generate JWT token for verification
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const verificationLink = `http://localhost:3000/api/auth/verify/${token}`;
    const message = `<h1>Email Verification</h1>
                     <p>Please click the following link to verify your email:</p>
                     <a href="${verificationLink}">${verificationLink}</a>`;

    await sendEmail(user.email, 'Verify your email', message);

    res.status(200).json({ msg: 'Registration successful, please verify your email' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
      const user = await User.findOne({ email, role: 'patient' });
      if (!user) {
          return res.status(400).json({ msg: 'User with this email does not exist' });
      }

      // Generate reset token
      const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const resetLink = `http://localhost:3000/api/patient/reset-password/${resetToken}`;
      const message = `<h1>Password Reset</h1>
                       <p>Please click the following link to reset your password:</p>
                       <a href="${resetLink}">${resetLink}</a>`;

      await sendEmail(user.email, 'Reset your password', message);

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

  console.log('Received token:', token); // Debugging
  console.log('Received newPassword:', newPassword); // Debugging

  if (!token || !newPassword) {
    return res.status(400).json({ msg: 'Token and new password are required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    if (!userId) {
      return res.status(400).json({ msg: 'Invalid token' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ msg: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ msg: 'Password reset successfully' });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};


module.exports = { registerPatient ,requestPasswordReset, resetPassword };
