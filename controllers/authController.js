const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper function to handle common registration logic
const handleRegistration = async (userData, role, res) => {
    try {
        let user = await User.findOne({ email: userData.email });

        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            ...userData,
            role,
            isVerified: false,
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(userData.password, salt);

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

// Register function for patients
const registerPatient = async (req, res) => {
    const { name, email, password } = req.body;
    await handleRegistration({ name, email, password }, 'patient', res);
};


// Route to handle email verification
const verify = async (req, res) => {
    const { token } = req.params;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({ msg: 'Invalid token' });
        }

        user.verified = true;
        await user.save();

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
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(400).json({ msg: 'Invalid credentials' });
      }

      // Check if password matches
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(400).json({ msg: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.status(200).json({ token });
  } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

module.exports = { registerPatient, verify, loginUser };
