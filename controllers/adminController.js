// controllers/adminController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const sendEmail = require('../utils/sendEmail');
const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const Staff = require('../models/Staff');
const Patient = require('../models/Patient');
const Permission = require('../models/Permission');
const Specialization = require('../models/Specialization');
const Appointment = require('../models/Appointment');
const PendingDoctor = require('../models/PendingDoctor');
const Invitation = require('../models/Invitation');
const Settings = require('../models/Settings');


// Function to send an invitation email to a doctor
const sendDoctorInvitation = async (req, res) => {
    const { email } = req.body;

    // Function to validate email format
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Check if the email is valid
    if (!isValidEmail(email)) {
        return res.status(400).json({ msg: 'Invalid email format' });
    }

    try {
        // Check if a doctor with the given email already exists
        const existingDoctor = await Doctor.findOne({ email });

        if (existingDoctor) {
            return res.status(400).json({ msg: 'Doctor with this email already exists' });
        }

        // Generate a token with the doctor's email
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Create a URL with the token
        const invitationLink = `http://localhost:3001/api/doctor/register/${token}`;

        // Send the invitation email
        let transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Doctor Registration Invitation',
            text: `Please register using the following link: ${invitationLink}`,
        };

        await transporter.sendMail(mailOptions);

        // Save the invitation data
        await Invitation.create({
            email: email,
            invitationToken: token,
            isInvitationUsed: false
        });

        res.status(200).json({ msg: 'Invitation sent successfully' });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ msg: 'Validation error', error: error.message });
        }

        if (error.code === 'ECONNREFUSED') {
            return res.status(500).json({ msg: 'Server error', error: 'Email server connection refused' });
        }

        return res.status(500).json({ msg: 'Server error', error: error.message });
    }
};


const verifyDoctor = async (req, res) => {
    const { doctorId } = req.body;

    try {
        // Find the pending doctor by ID
        const pendingDoctor = await PendingDoctor.findById(doctorId);
        if (!pendingDoctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        // Create a new doctor record with all necessary fields
        const newDoctor = new Doctor({
            name: pendingDoctor.name,
            email: pendingDoctor.email,
            password: pendingDoctor.password, // Ensure password is transferred
            professionalInfo: pendingDoctor.professionalInfo,
            specializations: pendingDoctor.specializations, // Use the specializations array with schedules
            isVerified: true,
            mustChangePassword: true,
        });

        // Save the new doctor record
        await newDoctor.save();

        // Delete the pending doctor record
        await PendingDoctor.findByIdAndDelete(doctorId);

        // Send verification email to doctor
        let transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: newDoctor.email,
            subject: 'Your Account has been Verified',
            text: `Dear Dr. ${newDoctor.name},\n\nYour account has been successfully verified. You can now log in using your existing credentials and change your password upon first login.\n\nBest regards,\nYour Company`,
        };

        // Handle email sending errors
        try {
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            return res.status(500).json({ msg: 'Error sending verification email' });
        }

        res.status(200).json({ msg: 'Doctor verified successfully, email sent' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// Function to create a new staff member
const createStaffMember = async (req, res) => {
    const { firstName, lastName, dateOfBirth, gender, email, phoneNumber, address, emergencyContactName, emergencyContactPhone } = req.body;

    try {
        // Check if staff member already exists
        const existingStaff = await Staff.findOne({ email });
        if (existingStaff) {
            return res.status(400).json({ msg: 'Staff member already exists' });
        }

        // Create new staff member
        const newStaff = new Staff({
            firstName,
            lastName,
            dateOfBirth,
            gender,
            email,
            phoneNumber,
            address,
            emergencyContactName,
            emergencyContactPhone,
            isVerified: false,
            mustChangePassword: false,
        });

        // Save new staff member to the database
        await newStaff.save();

        // Generate JWT token for verification
        const token = jwt.sign({ userId: newStaff._id, role: 'staff' }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Create verification link
        const verificationLink = `http://localhost:3000/api/staff/verify/${token}`;

        // Configure email transport
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Staff Account Created - Verification Required',
            text: `Dear ${firstName} ${lastName},\n\nYour staff account has been created. Please use the following link to verify your account and set your password:\n\nVerification Link: ${verificationLink}\n\nBest regards,\nYour Company`,
        };

        // Send verification email
        await transporter.sendMail(mailOptions);

        // Respond with success message
        res.status(201).json({ msg: 'Staff member created and verification email sent' });
    } catch (err) {
        // Handle Mongoose validation errors
        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: 'Validation error', error: err.message });
        }

        // Handle JWT signing errors
        if (err.name === 'JsonWebTokenError') {
            return res.status(500).json({ msg: 'Error generating JWT token', error: err.message });
        }

        // Handle Nodemailer errors
        if (err.name === 'NodemailerError') {
            return res.status(500).json({ msg: 'Error sending verification email', error: err.message });
        }

        // Handle generic server errors
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
};



// Controller function for changing user email
const changeUserEmail = async (req, res) => {
    const { userId } = req.params;
    const { newEmail } = req.body;

    try {
        let user = await Admin.findById(userId) ||
                   await Staff.findById(userId) ||
                   await Doctor.findById(userId) ||
                   await Patient.findById(userId);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const oldEmail = user.email;

        // Check if the user is a doctor and handle accordingly
        if (user instanceof Doctor) {
            user.email = newEmail;
            user.isVerified = false; // Reset verification status
            await user.save();

            // Notify the admin to verify the new email
            const adminEmail = process.env.ADMIN_EMAIL;
            const subject = 'Doctor Email Change Requires Verification';
            const html = `
                <p>Doctor ${user.name} has changed their email to ${newEmail}. Please verify the new email address.</p>
            `;
            await sendEmail(adminEmail, subject, html);

            // Send a notification to the old email
            const notificationMessage = `<p>Your email has been changed from ${oldEmail} to ${newEmail}. The new email requires verification by the admin.</p>`;
            await sendEmail(oldEmail, 'Email Changed', notificationMessage);

            // Send a verification link to the new email (to inform the doctor that verification is required)
            const verificationMessage = `<p>Your email change to ${newEmail} requires admin verification. You will be notified once it's verified.</p>`;
            await sendEmail(newEmail, 'Email Change Pending Verification', verificationMessage);

            return res.status(200).json({ msg: 'Email changed successfully. Admin will verify the new email.' });
        }

        // For other roles, proceed as before
        user.email = newEmail;
        user.isVerified = false;
        user.mustChangePassword = true; // Reset verification status
        await user.save();

        // Send notification to the old email
        const notificationMessage = `<p>Your email has been changed from ${oldEmail} to ${newEmail}.</p>`;
        await sendEmail(oldEmail, 'Email Changed', notificationMessage);

        // Send a verification link to the new email
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const verificationLink = `http://localhost:3000/api/auth/verify/${token}`;
        const verificationMessage = `<p>Please verify your new email address by clicking the link: <a href="${verificationLink}">${verificationLink}</a></p>`;
        await sendEmail(newEmail, 'Verify your new email', verificationMessage);

        return res.status(200).json({ msg: 'Email changed successfully. Verification link sent to the new email.' });
    } catch (err) {
        console.error('Error changing email:', err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

const manageSpecializations = async (req, res) => {
    try {
        const { method } = req;

        switch (method) {
            case 'POST': {
                // Create a new specialization
                const { name, description } = req.body;

                if (!name || !description) {
                    return res.status(400).json({ msg: 'Name and description are required' });
                }

                const existingSpec = await Specialization.findOne({ name });
                if (existingSpec) {
                    return res.status(400).json({ msg: 'Specialization already exists' });
                }

                const specialization = new Specialization({ name, description });
                await specialization.save();
                return res.status(201).json(specialization);
            }
            case 'GET': {
                // Get all specializations
                const specializations = await Specialization.find();
                if (!specializations) {
                    return res.status(404).json({ msg: 'No specializations found' });
                }
                return res.status(200).json(specializations);
            }
            case 'PUT': {
                // Update an existing specialization
                const { id } = req.params;
                const { name, description } = req.body;

                if (!id) {
                    return res.status(400).json({ msg: 'ID is required' });
                }

                const specialization = await Specialization.findById(id);
                if (!specialization) {
                    return res.status(404).json({ msg: 'Specialization not found' });
                }

                if (name) {
                    specialization.name = name;
                }
                if (description) {
                    specialization.description = description;
                }
                await specialization.save();

                return res.status(200).json(specialization);
            }
            case 'DELETE': {
                // Delete a specialization
                const { id } = req.params;

                if (!id) {
                    return res.status(400).json({ msg: 'ID is required' });
                }

                const specialization = await Specialization.findById(id);
                if (!specialization) {
                    return res.status(404).json({ msg: 'Specialization not found' });
                }

                await Specialization.findByIdAndDelete(id);
                return res.status(200).json({ msg: 'Specialization deleted' });
            }
            default: {
                return res.status(405).json({ msg: 'Method not allowed' });
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error processing request', error: error.message });
    }
};


const createOrUpdateSettings = async (req, res) => {
    try {
      const { 
        applicationName, 
        companyName, 
        hospitalEmail, 
        hospitalPhone, 
        hospitalStartDay, 
        hospitalStartTime, 
        hospitalAddress, 
        countryCode, 
        defaultLanguage, 
        aboutUs, 
        socialDetails 
      } = req.body;


      // Validate request body
      if (!applicationName || !companyName || !hospitalEmail || !hospitalPhone || !hospitalStartDay || !hospitalStartTime || !hospitalAddress || !countryCode || !defaultLanguage) {          
          return res.status(400).json({ msg: 'All fields are required' });
      }

      // Check if settings already exist (only one settings document should exist)
      let settings = await Settings.findOne();
      
      if (!settings) {
        // Create new settings
        settings = new Settings({
          applicationName, 
          companyName, 
          hospitalEmail, 
          hospitalPhone, 
          hospitalStartDay, 
          hospitalStartTime, 
          hospitalAddress, 
          countryCode, 
          defaultLanguage, 
          aboutUs, 
          socialDetails
        });
      } else {
        // Update existing settings
        settings.applicationName = applicationName;
        settings.companyName = companyName;
        settings.hospitalEmail = hospitalEmail;
        settings.hospitalPhone = hospitalPhone;
        settings.hospitalStartDay = hospitalStartDay;
        settings.hospitalStartTime = hospitalStartTime;
        settings.hospitalAddress = hospitalAddress;
        settings.countryCode = countryCode;
        settings.defaultLanguage = defaultLanguage;
        settings.aboutUs = aboutUs;
        settings.socialDetails = socialDetails;
      }

      // Validate settings data
    const validationError = settings.validateSync();
    if (validationError) {
      return res.status(400).json({ error: 'Validation failed', details: validationError });
    }
  
      await settings.save();
      res.status(200).json({ message: 'Settings saved successfully', settings });
    } catch (error) {
        console.error(error);
        if (error.name === 'MongoError' && error.code === 11000) {
          return res.status(400).json({ error: 'Duplicate entry' });
        }
        res.status(500).json({ error: 'Error saving settings' });
    }
};
  
const getSettings = async (req, res) => {
    try {
      const settings = await Settings.findOne(); // Retrieve the only settings document
      if (!settings) {
        return res.status(404).json({ error: 'Settings not found' });
      }
      res.status(200).json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching settings' });
    }
};


const uploadApplicationLogo = async (req, res) => {
    try {
      const file = req.files.applicationLogo ? req.files.applicationLogo[0] : null;
  
      if (!file) {
        return res.status(400).json({ msg: 'No logo file uploaded' });
      }
  
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ msg: 'Only image files are allowed' });
      }
  
      const settings = await Settings.findOne();
      if (!settings) {
        return res.status(404).json({ error: 'Settings not found' });
      }
  
      // Save logo in the settings
      settings.applicationLogo = {
        data: file.buffer,
        contentType: file.mimetype
      };
  
      await settings.save();
  
      res.status(200).json({ msg: 'Logo uploaded successfully' });
    } catch (err) {
      if (err.name === 'ValidationError') {
        res.status(400).json({ msg: 'Validation error', error: err.message });
      } else if (err.name === 'MongoError') {
        res.status(500).json({ msg: 'Database error', error: err.message });
      } else {
        res.status(500).json({ msg: 'Server error', error: err.message });
      }
    }
};

  
const uploadFavicon = async (req, res) => {
    try {
      // Check if a favicon file was uploaded
      const file = req.files.favicon ? req.files.favicon[0] : null;
      if (!file) {
        return res.status(400).json({ msg: 'No favicon file uploaded' });
      }
  
      // Validate file type
      const allowedFileTypes = ['image/x-icon', 'image/png', 'image/jpeg'];
      if (!allowedFileTypes.includes(file.mimetype)) {
        return res.status(400).json({ msg: 'Invalid file type. Only .ico, .png, and .jpg files are allowed.' });
      }
  
      // Retrieve settings document from database
      let settings = await Settings.findOne();
      if (!settings) {
        return res.status(404).json({ error: 'Settings not found' });
      }
  
      // Save favicon in the settings
      settings.favicon = {
        data: file.buffer,
        contentType: file.mimetype
      };
  
      // Validate and sanitize file data
      if (settings.favicon.data.length > 1024 * 1024) { // 1MB file size limit
        return res.status(400).json({ msg: 'File size exceeds the limit of 1MB' });
      }
  
      // Update settings document in database
      await settings.save();
  
      // Return success response
      res.status(200).json({ msg: 'Favicon uploaded successfully' });
    } catch (err) {
      // Log error for debugging purposes
      console.error(err);
  
      // Return error response
      if (err.name === 'ValidationError') {
        res.status(400).json({ msg: 'Validation error', error: err.message });
      } else if (err.name === 'MongoError') {
        res.status(500).json({ msg: 'Database error', error: err.message });
      } else {
        res.status(500).json({ msg: 'Server error', error: err.message });
      }
    }
};



// Generalized CRUD function for Permission management
const managePermissions = async (req, res) => {
    try {
        const { role } = req.params; // Role in the URL for PUT and DELETE
        const { permissions } = req.body; // Permissions passed in the request body (for selective permission deletion)

        // Check if role is provided in the URL
        if (!role && (req.method === 'PUT' || req.method === 'DELETE')) {
            return res.status(400).json({ msg: 'Role is required in the URL' });
        }

        // Check if permissions are provided in the request body for POST and PUT
        if (!permissions && (req.method === 'POST' || req.method === 'PUT')) {
            return res.status(400).json({ msg: 'Permissions are required in the request body' });
        }

        switch (req.method) {
            // Create or assign new role with permissions (POST)
            case 'POST': {
                // Check if the role already exists
                let existingRole = await Permission.findOne({ role });
                if (existingRole) {
                    return res.status(400).json({ msg: 'Role already exists. Use PUT to update permissions.' });
                }

                // Create a new role with permissions
                const newPermission = new Permission({ role, permissions });
                await newPermission.save();
                return res.status(201).json({ msg: 'Role and permissions created successfully', newPermission });
            }

            // Get all roles and permissions or a specific role's permissions (GET)
            case 'GET': {
                if (role) {
                    const permissionDoc = await Permission.findOne({ role });
                    if (!permissionDoc) {
                        return res.status(404).json({ msg: 'Permissions not found for this role' });
                    }
                    return res.json(permissionDoc);
                } else {
                    const permissions = await Permission.find();
                    return res.json(permissions);
                }
            }

            // Add new permissions to an existing role without replacing existing permissions (PUT)
            case 'PUT': {
                // Find the role and update the permissions
                let permissionDoc = await Permission.findOne({ role });

                if (!permissionDoc) {
                    return res.status(404).json({ msg: 'Role not found. Use POST to create a new role.' });
                }

                // Loop over new permissions and add them if they don't exist, or update existing ones
                Object.keys(permissions).forEach(permission => {
                    permissionDoc.permissions.set(permission, permissions[permission]);
                });

                await permissionDoc.save();

                return res.json({ msg: 'New permissions added successfully', permissionDoc });
            }

            // Delete a role or specific permissions (DELETE)
            case 'DELETE': {
                const permissionDoc = await Permission.findOne({ role });

                if (!permissionDoc) {
                    return res.status(404).json({ msg: 'Role not found' });
                }

                // Check if specific permissions are provided in the request body
                if (permissions && Object.keys(permissions).length > 0) {
                    // Selective permission deletion
                    Object.keys(permissions).forEach(permissionName => {
                        // Remove only the specified permissions if they exist
                        if (permissionDoc.permissions.has(permissionName)) {
                            permissionDoc.permissions.delete(permissionName);
                        }
                    });

                    // Save the updated permission document
                    await permissionDoc.save();

                    return res.json({ msg: 'Selected permissions deleted successfully', permissionDoc });
                } else {
                    // If no specific permissions are provided, delete the entire role
                    await Permission.findOneAndDelete({ role });

                    return res.json({ msg: 'Role and all permissions deleted successfully' });
                }
            }

            default:
                return res.status(405).json({ msg: 'Method not allowed' });
        }
    } catch (err) {
        console.error('Server error:', err.message);
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
};


  
module.exports = { sendDoctorInvitation, verifyDoctor, createStaffMember, manageSpecializations, managePermissions,
    createOrUpdateSettings, getSettings, uploadApplicationLogo, uploadFavicon, changeUserEmail };
