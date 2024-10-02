const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const Staff = require('../models/Staff');
const Patient = require('../models/Patient');



const changePassword = async (req, res) => {
    const { email, newPassword } = req.body;

    if (req.headers.authorization) {
        // Extract token from the Authorization header
        const token = req.headers.authorization.split(' ')[1]; 

        // Handling the reset password scenario
        try {
            // Verify token and extract userId and role
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const { userId, role } = decoded;

            // Find user based on role and userId
            let user;
            switch (role) {
                case 'admin':
                    user = await Admin.findById(userId);
                    break;
                case 'doctor':
                    user = await Doctor.findById(userId);
                    break;
                case 'staff':
                    user = await Staff.findById(userId);
                    break;
                case 'patient':
                    user = await Patient.findById(userId);
                    break;
                default:
                    return res.status(400).json({ msg: 'Invalid role' });
            }

            // Check if user is found
            if (!user) {
                return res.status(400).json({ msg: 'Invalid token' });
            }

            // Hash the new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // Update user record
            user.password = hashedPassword;
            user.mustChangePassword = false;
            await user.save();

            // Return success message
            res.status(200).json({ msg: 'Password changed successfully' });
        } catch (error) {
            // Return error message if password change fails
            res.status(400).json({ msg: 'Error changing password', error: error.message });
        }
    } 
    // Handling the forgot password scenario
    else if (email) {
        try {
            // Find user based on email and role
            let user;
            let role;
            
            user = await Admin.findOne({ email });
            if (user) role = 'admin';
            else {
                user = await Doctor.findOne({ email });
                if (user) role = 'doctor';
                else {
                    user = await Staff.findOne({ email });
                    if (user) role = 'staff';
                    else {
                        user = await Patient.findOne({ email });
                        if (user) role = 'patient';
                    }
                }
            }

            // Return error if user is not found
            if (!user) {
                return res.status(404).json({ msg: 'Email not found' });
            }

            // Generate password reset token
            const token = jwt.sign(
                { userId: user._id, role },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // Create password reset link
            const resetLink = `http://localhost:3000/reset-password/${token}`;

            // Create transporter for sending email
            const transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            // Create mail options
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Password Reset',
                text: `Please reset your password using the following link: ${resetLink}`
            };

            // Send email with password reset link
            await transporter.sendMail(mailOptions);

            // Return success message
            res.status(200).json({ msg: 'Password reset link sent' });
        } catch (error) {
            // Return server error message
            res.status(500).json({ msg: 'Server error', error: error.message });
        }
    } else {
        res.status(400).json({ msg: 'Invalid request' });
    }
};



const uploadProfilePicture = async (req, res) => {
    const userId = req.user.userId;
    const file = req.files.profilePicture ? req.files.profilePicture[0] : null; // Accessing the uploaded file

    if (!file) {
        return res.status(400).json({ msg: 'No profile picture uploaded' });
    }

    try {
        // Identify user based on role
        let user;
        switch (req.user.role) {
            case 'Admin':
                user = await Admin.findById(userId);
                break;
            case 'Doctor':
                user = await Doctor.findById(userId);
                break;
            case 'Staff':
                user = await Staff.findById(userId);
                break;
            case 'Patient':
                user = await Patient.findById(userId);
                break;
            default:
                return res.status(400).json({ msg: 'Invalid role' });
        }

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Store the image as binary data in the user's profile
        user.profilePicture = {
            data: file.buffer,
            contentType: file.mimetype
        };

        await user.save();

        res.status(200).json({ msg: 'Profile picture uploaded successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};


const viewProfilePicture = async (req, res) => {
    const userId = req.user.userId;

    try {
        let user;
        switch (req.user.role) {
            case 'Admin':
                user = await Admin.findById(userId);
                break;
            case 'Doctor':
                user = await Doctor.findById(userId);
                break;
            case 'Staff':
                user = await Staff.findById(userId);
                break;
            case 'Patient':
                user = await Patient.findById(userId);
                break;
            default:
                return res.status(400).json({ msg: 'Invalid role' });
        }

        if (!user || !user.profilePicture) {
            return res.status(404).json({ msg: 'Profile picture not found' });
        }

        // Serve the image as binary data
        res.set('Content-Type', user.profilePicture.contentType);
        res.send(user.profilePicture.data);
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};


const deleteProfilePicture = async (req, res) => {
    const userId = req.user.userId;

    try {
        let user;
        switch (req.user.role) {
            case 'Admin':
                user = await Admin.findById(userId);
                break;
            case 'Doctor':
                user = await Doctor.findById(userId);
                break;
            case 'Staff':
                user = await Staff.findById(userId);
                break;
            case 'Patient':
                user = await Patient.findById(userId);
                break;
            default:
                return res.status(400).json({ msg: 'Invalid role' });
        }

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (!user.profilePicture) {
            return res.status(404).json({ msg: 'Profile picture not found' });
        }

        // Remove the profile picture from the user's profile
        user.profilePicture = undefined;

        await user.save();

        res.status(200).json({ msg: 'Profile picture deleted successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};



const uploadMedicalFile = async (req, res) => {
    const userId = req.user.userId;
    const file = req.files.medicalFile ? req.files.medicalFile[0] : null; // Accessing the uploaded file

    if (!file) {
        return res.status(400).json({ msg: 'No medical file uploaded' });
    }

    try {
        // Ensure only patients can upload medical files
        if (req.user.role !== 'Patient') {
            return res.status(403).json({ msg: 'Only patients can upload medical files' });
        }

        // Find the patient
        const patient = await Patient.findById(userId);
        if (!patient) {
            return res.status(404).json({ msg: 'Patient not found' });
        }

        // Store the medical file in the patient's record
        const medicalFile = {
            fileName: file.originalname,
            contentType: file.mimetype,
            data: file.buffer, // Store the binary data
            uploadDate: new Date(),
        };

        patient.medicalFiles.push(medicalFile);
        await patient.save();

        res.status(200).json({ msg: 'Medical file uploaded successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};




// View Medical File (modified to allow different roles to access patient files)
const viewMedicalFile = async (req, res) => {
    const userId = req.user.userId;
    const patientId = req.params.patientId || userId; // Patient or Admin/Doctor can pass a patientId

    try {
        // Ensure that only the patient, doctor, admin, or staff can access the files
        if (req.user.role === 'Patient' && userId !== patientId) {
            return res.status(403).json({ msg: 'You can only view your own medical files' });
        }

        const patient = await Patient.findById(patientId);
        if (!patient || !patient.medicalFiles || patient.medicalFiles.length === 0) {
            return res.status(404).json({ msg: 'No medical files found' });
        }

        // Return the list of file metadata (not the actual file data)
        const fileList = patient.medicalFiles.map((file, index) => ({
            index, // File index in the array
            fileName: file.fileName,
            uploadDate: file.uploadDate,
            contentType: file.contentType,
        }));

        res.status(200).json(fileList);
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Delete Medical File (modified to allow only patients to delete their own files)

const deleteMedicalFile = async (req, res) => {
    const fileIndex = parseInt(req.params.fileIndex, 10); // Ensure fileIndex is an integer
    const userId = req.user.userId; // Extract patient ID from token (userId)

    try {
        // Only the patient themselves can delete files
        if (req.user.role !== 'Patient') {
            return res.status(403).json({ msg: 'You can only delete your own medical files' });
        }

        // Find the patient using the userId from the token
        const patient = await Patient.findById(userId);
        if (!patient || !patient.medicalFiles || !patient.medicalFiles[fileIndex]) {
            return res.status(404).json({ msg: 'Medical file not found' });
        }

        // Remove the file from the medicalFiles array
        patient.medicalFiles.splice(fileIndex, 1);
        await patient.save();

        res.status(200).json({ msg: 'Medical file deleted successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};



module.exports = { changePassword, uploadProfilePicture, viewProfilePicture, deleteProfilePicture, uploadMedicalFile, viewMedicalFile, deleteMedicalFile };
