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

// Function to view doctor personal information
const viewDoctorDetails = async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const doctor = await Doctor.findById(decoded.userId).select('-password');
        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        res.status(200).json(doctor);
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Function to update doctor personal information
const updateDoctorDetails = async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    const { name, professionalInfo, schedule, currentPassword, newPassword } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const doctor = await Doctor.findById(decoded.userId);
        if (!doctor) {
            return res.status(400).send('Invalid token');
        }

        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, doctor.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Current password is incorrect' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            doctor.password = hashedPassword;
            doctor.mustChangePassword = false;
        }

        if (name) doctor.name = name;
        if (professionalInfo) doctor.professionalInfo = professionalInfo;
        if (schedule) doctor.schedule = schedule;

        await doctor.save();
        res.send('Doctor details updated successfully');
    } catch (error) {
        console.log('Error updating doctor details:', error); // Log the error
        res.status(400).send('Error updating doctor details');
    }
};

module.exports = { registerDoctor, loginDoctor, changeDoctorPassword, viewDoctorDetails, updateDoctorDetails };
