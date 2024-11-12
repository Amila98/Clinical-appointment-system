const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Staff = require('../models/Staff');
const Patient = require('../models/Patient');
const Reminder = require('../models/Reminder');
const Appointment = require('../models/Appointment');
const { sendReminder } = require('../utils/sendEmail');   


const verifyStaff = async (req, res) => {
    // Destructure the token and password from the request body
    const { token } = req.params;
    const { password } = req.body;

    console.log(token, password);

    try {
        // Decode the token using the JWT secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the staff member by their ID
        const staff = await Staff.findById(decoded.userId);

        // If the staff member does not exist or is already verified, return an error
        if (!staff || staff.isVerified) {
            return res.status(400).json({ msg: 'Invalid token' });
        }

        // Generate a salt and hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update the staff member's password and verification status
        staff.password = hashedPassword;
        staff.isVerified = true;

        // Save the changes to the staff member
        await staff.save();

        // Return a success message
        res.status(200).json({ msg: 'Staff member verified and password set successfully' });
    } catch (err) {
        // Return an error message if there was a server error
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
};


const sendReminders = async (req, res) => {
    const { appointmentIds, messageTemplate } = req.body;

    try {
        const appointments = await Appointment.find({
            _id: { $in: appointmentIds },
            status: 'Scheduled'
        }).populate('doctor patient');

        const result = {
            sent: [],
            failed: []
        };

        for (const appointment of appointments) {
            const { patient, doctor, day, timeSlot } = appointment;

            if (!patient || !patient.email) {
                result.failed.push({
                    appointmentId: appointment._id,
                    error: 'No patient email found'
                });
                continue;
            }

            // Default message template if none is provided
            const defaultTemplate = `Dear ${patient.name}, you have an upcoming appointment with Dr. ${doctor.name} on ${day} from ${timeSlot.start} to ${timeSlot.end}.`;

            // Use the provided template or fall back to the default one
            const template = messageTemplate || defaultTemplate;

            // Replace placeholders in the template
            const message = template
                .replace('{patientName}', patient.name)
                .replace('{doctorName}', doctor.name)
                .replace('{day}', day)
                .replace('{startTime}', timeSlot.start)
                .replace('{endTime}', timeSlot.end);

            try {
                await sendReminder(patient.email, message); // Send the reminder email

                // Save the reminder log in the database
                await Reminder.create({
                    appointmentId: appointment._id,
                    patientId: patient._id,
                    doctorId: doctor._id,
                    message,
                    template,
                    variables: {
                        patientName: patient.name,
                        doctorName: doctor.name,
                        day,
                        startTime: timeSlot.start,
                        endTime: timeSlot.end
                    },
                    status: 'Sent'
                });

                result.sent.push(appointment._id);
            } catch (error) {
                console.error('Error sending reminder:', error);

                result.failed.push({
                    appointmentId: appointment._id,
                    error: error.message || 'Unknown error'
                });

                // Save the failed reminder log
                await Reminder.create({
                    appointmentId: appointment._id,
                    patientId: patient._id,
                    doctorId: doctor._id,
                    message,
                    status: 'Failed',
                    error: error.message || 'Unknown error'
                });
            }
        }

        res.status(200).json({ message: 'Reminders processed', result });
    } catch (error) {
        console.error('Error sending reminders:', error);
        
        res.status(500).json({ message: 'Error sending reminders', error: error.message || 'Unknown error' });
    }
};


/*const sendReminders = async (req, res) => {
    const { appointmentIds, messageTemplate } = req.body; // messageTemplate is optional for single reminders

    const result = {
        sent: [],
        failed: []
    };

    // Default message template
    const defaultTemplate = `Dear {patientName}, you have an upcoming appointment with Dr. {doctorName} on {day} from {startTime} to {endTime}.`;

    try {
        // Check if appointmentIds is an array for bulk sending
        if (Array.isArray(appointmentIds)) {
            // Process bulk reminders
            for (const appointmentId of appointmentIds) {
                const appointment = await Appointment.findById(appointmentId).populate('doctor patient');

                if (!appointment || appointment.status !== 'Scheduled') {
                    result.failed.push({
                        appointmentId,
                        error: 'Appointment not found or not scheduled'
                    });
                    continue;
                }

                const { patient, doctor, day, timeSlot } = appointment;

                if (!patient || !patient.email) {
                    result.failed.push({
                        appointmentId,
                        error: 'No patient email found'
                    });
                    continue;
                }

                // Use the default template for bulk sending
                const message = defaultTemplate
                    .replace('{patientName}', patient.name)
                    .replace('{doctorName}', doctor.name)
                    .replace('{day}', day)
                    .replace('{startTime}', timeSlot.start)
                    .replace('{endTime}', timeSlot.end);

                await sendReminderAndLog(appointment, message, result);
            }
        } else {
            // Single appointment case with optional custom message
            const appointment = await Appointment.findById(appointmentIds).populate('doctor patient');

            if (!appointment || appointment.status !== 'Scheduled') {
                return res.status(400).json({ message: 'Appointment not found or not scheduled' });
            }

            const { patient, doctor, day, timeSlot } = appointment;

            if (!patient || !patient.email) {
                return res.status(400).json({ message: 'No patient email found' });
            }

            // Use the provided message template or the default one for individual reminders
            const message = messageTemplate 
                ? messageTemplate
                    .replace('{patientName}', patient.name)
                    .replace('{doctorName}', doctor.name)
                    .replace('{day}', day)
                    .replace('{startTime}', timeSlot.start)
                    .replace('{endTime}', timeSlot.end)
                : defaultTemplate
                    .replace('{patientName}', patient.name)
                    .replace('{doctorName}', doctor.name)
                    .replace('{day}', day)
                    .replace('{startTime}', timeSlot.start)
                    .replace('{endTime}', timeSlot.end);

            await sendReminderAndLog(appointment, message, result);
        }

        res.status(200).json({ message: 'Reminders processed', result });
    } catch (error) {
        console.error('Error sending reminders:', error);
        res.status(500).json({ message: 'Error sending reminders', error: error.message || 'Unknown error' });
    }
};

// Helper function to send reminder and log the result
const sendReminderAndLog = async (appointment, message, result) => {
    try {
        await sendReminder(appointment.patient.email, message); // Send the reminder email

        // Save the reminder log in the database
        await Reminder.create({
            appointmentId: appointment._id,
            patientId: appointment.patient._id,
            doctorId: appointment.doctor._id,
            message,
            template: message,
            variables: {
                patientName: appointment.patient.name,
                doctorName: appointment.doctor.name,
                day: appointment.day,
                startTime: appointment.timeSlot.start,
                endTime: appointment.timeSlot.end
            },
            status: 'Sent'
        });

        result.sent.push(appointment._id);
    } catch (error) {
        console.error('Error sending reminder:', error);
        result.failed.push({
            appointmentId: appointment._id,
            error: error.message || 'Unknown error'
        });

        // Save the failed reminder log
        await Reminder.create({
            appointmentId: appointment._id,
            patientId: appointment.patient._id,
            doctorId: appointment.doctor._id,
            message,
            status: 'Failed',
            error: error.message || 'Unknown error'
        });
    }
};
*/

module.exports = { verifyStaff, sendReminders };


