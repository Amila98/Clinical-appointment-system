// controllers/doctorController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');

// Doctor registration function
// controllers/doctorController.js
const registerDoctor = async (req, res) => {
  const { token } = req.query;
  const { name, email, password, professionalInfo, schedule } = req.body;

  try {
      // Log the received token and request body
      console.log("Received token:", token);
      console.log("Request body:", req.body);

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded);

      if (decoded.email !== email) {
          return res.status(400).json({ msg: 'Invalid token' });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create and save the doctor
      const newDoctor = new Doctor({
          name,
          email,
          password: hashedPassword,
          professionalInfo,
          schedule,
          isVerified: true,
          mustChangePassword: true,
      });

      await newDoctor.save();
      res.status(201).json({ msg: 'Doctor registered successfully' });
  } catch (err) {
      console.error("Error in registerDoctor:", err);
      res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Doctor login function
const loginDoctor = async (req, res) => {
  const { email, password } = req.body;

  try {
      const doctor = await Doctor.findOne({ email });

      if (!doctor) {
          return res.status(400).json({ msg: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, doctor.password);

      if (!isMatch) {
          return res.status(400).json({ msg: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: doctor._id, role: 'doctor' }, process.env.JWT_SECRET, { expiresIn: '1h' });

      if (doctor.mustChangePassword) {
          return res.status(200).json({ msg: 'Password change required', mustChangePassword: true, token });
      }

      res.status(200).json({ token });
  } catch (err) {
      res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

const changeDoctorPassword = async (req, res) => {
  const { newPassword } = req.body;
  const doctorId = req.user.userId;

  try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await Doctor.findByIdAndUpdate(doctorId, { password: hashedPassword, mustChangePassword: false });

      res.status(200).json({ msg: 'Password changed successfully' });
  } catch (err) {
      res.status(500).json({ msg: 'Server error', error: err.message });
  }
};



module.exports = { registerDoctor, loginDoctor, changeDoctorPassword };
