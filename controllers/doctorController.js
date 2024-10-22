// controllers/doctorController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const sendEmail = require('../utils/sendEmail');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Specialization = require('../models/Specialization');
const PendingDoctor = require('../models/PendingDoctor');
const Invitation = require('../models/Invitation');
const Appointment = require('../models/Appointment');
const Break = require('../models/Break');
const AppointmentHistory = require('../models/AppointmentHistory');
const cron = require('node-cron');
const Article = require('../models/Article');

const registerDoctor = async (req, res) => {
  try {
      const { name, password, professionalInfo, specializations } = req.body;
      const { token } = req.params;

      // Find the invitation with the given token
      const invitation = await Invitation.findOne({ invitationToken: token });

      if (!invitation || invitation.isInvitationUsed) {
          return res.status(400).json({ msg: 'Invalid or expired token.' });
      }

      // Check if the invitation has expired (24-hour expiry check)
      if (invitation.expiresAt < new Date()) {
          return res.status(400).json({ msg: 'Invitation token has expired.' });
      }

      // Hash the doctor's password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Prepare the specializations array
      let specializationsWithSchedules = [];

      if (specializations && specializations.length > 0) {
          specializationsWithSchedules = await Promise.all(specializations.map(async (spec) => {
              try {
                  const { specializationId, schedules } = spec;

                  // Check if the specialization exists
                  const specialization = await Specialization.findById(specializationId);
                  if (!specialization) {
                      throw new Error(`Specialization not found with ID: ${specializationId}`);
                  }

                  // Prepare schedules and divide time into slots
                  const createdSchedules = schedules.map(sched => {
                      const { day, startTime, endTime, appointmentTimeLimit } = sched;
                      const appointmentLimit = appointmentTimeLimit;

                      // Convert start and end time to Date objects
                      const start = new Date(`1970-01-01T${startTime}:00Z`);
                      const end = new Date(`1970-01-01T${endTime}:00Z`);

                      // Calculate total time and number of slots
                      const totalMinutes = (end - start) / (1000 * 60);
                      const numSlots = Math.floor(totalMinutes / appointmentLimit);

                      let appointmentSlots = [];
                      for (let i = 0; i < numSlots; i++) {
                          let slotStart = new Date(start.getTime() + i * appointmentLimit * 60000);
                          let slotEnd = new Date(slotStart.getTime() + appointmentLimit * 60000);

                          appointmentSlots.push({
                              startTime: slotStart.toISOString().substring(11, 16),
                              endTime: slotEnd.toISOString().substring(11, 16),
                          });
                      }

                      return {
                          day,
                          startTime,
                          endTime,
                          appointmentTimeLimit: appointmentLimit,
                          appointmentSlots: appointmentSlots // This stores the generated slots
                      };
                  });

                  return {
                      specializationId,
                      schedules: createdSchedules
                  };
              } catch (error) {
                  throw new Error(`Error processing specialization: ${error.message}`);
              }
          }));
      }

      // Create a new pending doctor with the given information
      const pendingDoctor = new PendingDoctor({
          name,
          email: invitation.email, // Use the email from the invitation
          password: hashedPassword,
          professionalInfo,
          specializations: specializationsWithSchedules // Include specializations with schedules
      });

      // Save the doctor
      try {
          await pendingDoctor.save();
      } catch (error) {
          throw new Error(`Error saving doctor: ${error.message}`);
      }

      // Mark the invitation as used
      invitation.isInvitationUsed = true;
      try {
          await invitation.save();
      } catch (error) {
          throw new Error(`Error marking invitation as used: ${error.message}`);
      }

      // Delete the invitation after successful registration
      try {
          await Invitation.deleteOne({ _id: invitation._id });
      } catch (error) {
          throw new Error(`Error deleting invitation: ${error.message}`);
      }

      // Send an email to the admin to verify the registration
      const adminEmail = process.env.ADMIN_EMAIL;
      const subject = 'New Doctor Registration Needs Verification';
      try {
          await sendEmail(adminEmail, subject, `<p>A new doctor has registered with the email ${invitation.email}. Please verify the registration by visiting the verification page and approving their account.</p>`);
      } catch (error) {
          throw new Error(`Error sending email: ${error.message}`);
      }

      res.status(201).json({ msg: 'Doctor registered successfully. Admin will verify the registration.' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ msg: 'Server error', error: error.message });
  }
};




// Function to update doctor personal information
const updateDoctorDetails = async (req, res) => {
    // Extract the token from the request headers
    const token = req.headers.authorization.split(' ')[1];
    // Destructure the request body properties
    const { name, professionalInfo, currentPassword, newPassword } = req.body;

    try {
        // Verify the token and decode the user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Find the doctor by ID
        const doctor = await Doctor.findById(decoded.userId);
        if (!doctor) {
            return res.status(400).send('Invalid token');
        }

        // Check if the current password and new password are provided
        if (currentPassword && newPassword) {
            // Compare the current password with the stored password
            const isMatch = await bcrypt.compare(currentPassword, doctor.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Current password is incorrect' });
            }

            // Generate a salt for password hashing
            const salt = await bcrypt.genSalt(10);
            // Hash the new password with the generated salt
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            // Update the password and mustChangePassword flag
            doctor.password = hashedPassword;
            doctor.mustChangePassword = false;
        }

        // Update the doctor's personal information if provided
        if (name) doctor.name = name;
        if (professionalInfo) doctor.professionalInfo = professionalInfo;
        if (schedule) doctor.schedule = schedule;

        // Update profile picture if a new one is uploaded
        if (req.file) {
            doctor.profilePicture = req.file.path;
        }

        // Save the updated doctor details to the database
        await doctor.save();
        // Send success message to the client
        res.send('Doctor details updated successfully');
    } catch (error) {
        // Log the error and send an error response to the client
        console.log('Error updating doctor details:', error);
        console.log('Error updating doctor details:', error); // Log the error
        res.status(400).send('Error updating doctor details');
    }
};


// Fetch appointment history for a specific patient
const appointmentHistory = async (req, res) => {
  try {
    const { patientId, appointmentId } = req.params; // Extract patientId and appointmentId from request parameters

    // Clean the patientId
    const cleanedPatientId = patientId.replace(/^:*/, '');

    // Validate patientId
    if (!mongoose.Types.ObjectId.isValid(cleanedPatientId)) {
      return res.status(400).json({ message: 'Invalid patient ID.' });
    }

    // Validate appointmentId if provided
    if (appointmentId && !mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ message: 'Invalid appointment ID.' });
    }

    // Fetch all appointment histories for the patient
    const appointmentHistoryRecords = await AppointmentHistory.find({ patient: cleanedPatientId })
      .populate('patient', 'name')
      .populate('doctor', 'name')
      .populate('specialization', 'name')
      .select('day timeSlot status treatmentPlan prescription')
      .exec();

    // Check if appointment history exists
    if (!appointmentHistoryRecords.length) {
      return res.status(404).json({ message: 'No appointment history found for this patient.' });
    }

    // If appointmentId is provided, fetch the appointment details
    let appointmentDetails = null;
    if (appointmentId) {
      appointmentDetails = await Appointment.findById(appointmentId)
        .populate('doctor', 'name') // Populate doctor details if needed
        .populate('patient', 'name') // Populate patient details if needed
        .populate('specialization', 'name') // Populate specialization details if needed
        .exec();

      // Check if the appointment exists
      if (!appointmentDetails) {
        return res.status(404).json({ message: 'Appointment not found.' });
      }
    }

    // Return the patient's appointment history and appointment details (if available)
    return res.status(200).json({
      appointmentHistory: appointmentHistoryRecords,
      appointmentDetails, // This will be null if appointmentId was not provided
    });
  } catch (error) {
    console.error('Error fetching appointment history:', error);
    res.status(500).json({ message: 'Failed to retrieve appointment history.' });
  }
};




const treatmentPlan = async (req, res) => {
  const { appointmentId } = req.params;  // Get the appointment ID from URL parameters
  const { treatmentDetails, prescriptionDetails } = req.body;  // Get both treatment and prescription details

  try {
      const appointment = await Appointment.findById(appointmentId)
          .populate('doctor', 'name')
          .populate('patient', 'name')
          .populate('specialization', 'name')
          .populate({
            path: 'doctor',
            populate: {
                path: 'specializations.schedules',  // Ensure schedule is populated
            }
          });

      if (!appointment) {
          return res.status(404).json({ msg: 'Appointment not found' });
      }

      // Check if treatmentDetails are provided
      if (!treatmentDetails && !prescriptionDetails) {
          return res.status(400).json({ msg: 'Either treatment plan or prescription details are required.' });
      }

      // Create a new history entry in AppointmentHistory with treatment and prescription details
      const historyEntry = new AppointmentHistory({
          appointment: appointment._id,
          doctor: appointment.doctor._id,
          patient: appointment.patient._id,
          specialization: appointment.specialization._id,
          day: appointment.day,
          timeSlot: appointment.timeSlot._id,
          status: 'Completed',
          treatmentPlan: treatmentDetails || [],  // Include treatment plan details if provided
          prescription: prescriptionDetails || [],  // Include prescription details if provided
          created_at: appointment.created_at,
      });

      await historyEntry.save();

      // Optional: Delete the appointment or mark it as completed
      await Appointment.findByIdAndDelete(appointmentId);

      res.status(201).json({ msg: 'Treatment plan and/or prescription added and appointment moved to history', history: historyEntry });
    } catch (error) {
      console.error('Error adding treatment plan and prescription:', error);
      if (error.name === 'ValidationError') {
        res.status(400).json({ msg: 'Validation error', error: error.message });
      } else if (error.name === 'MongoError') {
        res.status(500).json({ msg: 'Database error', error: error.message });
      } else {
        res.status(500).json({ msg: 'Server error', error: error.message });
      }
    }
};



const updateTreatment = async (req, res) => {
  const { appointmentHistoryId } = req.params;  // Get the appointment history ID from URL parameters
  const { treatmentDetails, prescriptionDetails } = req.body;  // Get updated treatment details and prescription

  try {
      // Find the appointment history by its ID
      const appointmentHistory = await AppointmentHistory.findById(appointmentHistoryId)
          .populate('doctor', 'name')
          .populate('patient', 'name')
          .populate('specialization', 'name');

      if (!appointmentHistory) {
          return res.status(404).json({ msg: 'Appointment history not found' });
      }

      // Update treatment details if provided
      if (treatmentDetails) {
          appointmentHistory.treatmentPlan = treatmentDetails;
      }

      // Update prescription details if provided
      if (prescriptionDetails) {
          appointmentHistory.prescription = prescriptionDetails;
      }

      // Save updated appointment history
      await appointmentHistory.save();

      res.status(200).json({ msg: 'Appointment history updated successfully', history: appointmentHistory });
    } catch (error) {
      console.error('Error updating treatment plan and prescription:', error);
      if (error.name === 'ValidationError') {
        res.status(400).json({ msg: 'Validation error', error: error.message });
      } else if (error.name === 'MongoError') {
        res.status(500).json({ msg: 'Database error', error: error.message });
      } else {
        res.status(500).json({ msg: 'Server error', error: error.message });
      }
    }
};


const createArticle = async (req, res) => {
  const doctorId = req.user.userId; // Assuming the user is a doctor
  const file = req.files && req.files.featureImage ? req.files.featureImage[0] : null; // Accessing the uploaded feature image

  console.log(file);

  if (!file) {
      return res.status(400).json({ msg: 'No feature image uploaded' });
  }

  try {
      const { articleId } = req.params;

      let article;
      if (articleId) {
          // Update existing article
          article = await Article.findById(articleId);
          if (!article) {
              return res.status(404).json({ msg: 'Article not found' });
          }
      } else {
          // Create new article
          const { title, specialization, content, schedule_post } = req.body;
          article = new Article({
              title,
              specialization,
              content,
              schedule_post,
              author: doctorId, // The author is the logged-in doctor
              status: schedule_post ? 'Scheduled' : 'Draft'
          });
      }
      // Store the uploaded feature image as binary data in the article
      article.featureImage = {
          data: file.buffer, // Image data in buffer format
          contentType: file.mimetype // Image type (e.g., image/jpeg)
      };

      console.log(article.featureImage);

      await article.save();

      res.status(200).json({
          msg: articleId ? 'Feature image updated successfully' : 'Article created with feature image',
          article
      });
  } catch (err) {
    console.error(err);
      res.status(500).json({ msg: 'Server error', error: err.message });
  }
};




const getMyArticles = async (req, res) => {
  try {
    const { specialization_id } = req.query;  // Get specialization_id from query parameters
    let articles;

    const query = {};

    // If specialization_id is provided in the query, add it to the filter
    if (specialization_id) {
      query.specialization = specialization_id;
    }

    // Check the user's role to decide which articles they can view
    switch (req.user.role) {
      case 'Doctor':
        // Doctor: can view only their own articles
        query.author = req.user.userId;
        articles = await Article.find(query);
        break;
      
      case 'Admin':
        // Admin: can view all articles, optionally filtered by specialization
        articles = await Article.find(query);
        break;

      case 'Patient':
        // Patient: can view only published articles, optionally filtered by specialization
        query.status = 'Published';
        articles = await Article.find(query);
        break;

      default:
        return res.status(403).json({ error: 'Access denied' });
    }

    res.status(200).json(articles);
  } catch (error) {
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid request parameters' });
    } else if (error.name === 'MongoError') {
      return res.status(500).json({ error: 'Database error' });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};

const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, specialization_id, content, schedule_post } = req.body;
    const file = req.files && req.files.featureImage ? req.files.featureImage[0] : null;

    // Validate request body
    if (!title || !specialization_id || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find the article by its ID
    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Update the article fields
    article.title = title;
    article.specialization = specialization_id;
    article.content = content;
    article.schedule_post = schedule_post;
    article.status = schedule_post ? 'Scheduled' : 'Draft';

    // If a new feature image was uploaded, update it
    if (file) {
      // Validate file type and size
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
      }
      if (file.size > 1024 * 1024 * 5) { // 5MB
        return res.status(400).json({ error: 'File size exceeds the limit of 5MB.' });
      }
      article.featureImage = {
        data: file.buffer,
        contentType: file.mimetype,
      };
    }

    // Save the updated article
    await article.save();
    res.status(200).json({ message: 'Article updated successfully', article });
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: 'Validation error', details: error.message });
    } else {
      res.status(500).json({ error: 'Error updating article', details: error.message });
    }
  }
};

const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the article ID is valid
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid article ID' });
    }

    // Check if the article exists
    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Optional: Authorization check
    // Only the author (doctor) or an admin can delete the article
    if (req.user.role !== 'Admin' && req.user._id.toString() !== article.author.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete the article
    try {
      await Article.findByIdAndDelete(id);
      res.status(200).json({ message: 'Article deleted successfully' });
    } catch (deleteError) {
      console.error('Error deleting article:', deleteError);
      res.status(500).json({ error: 'Error deleting article' });
    }

  } catch (error) {
    console.error('Error handling delete article request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



const scheduleFollowUpAppointment = async (req, res) => {
  const { appointmentId } = req.params; // Get the appointment ID from URL parameters
  const { day, schedule_id, selectedSlot } = req.body; // Get the day, schedule ID, and selected slot for the new appointment

  const doctorId = req.user.userId; // Get user ID from the token
  const userRole = req.user.role; // Get user role from the token

  try {
    if (userRole !== 'Doctor') {
      return res.status(403).json({ msg: 'Only Doctor can schedule follow-up appointments.' });
    }

    // Validate appointmentId
    if (!mongoose.isValidObjectId(appointmentId)) {
      return res.status(400).json({ msg: 'Invalid appointment ID' });
    }

    // Find the original appointment based on the provided appointment ID
    const originalAppointment = await Appointment.findById(appointmentId)
      .populate('doctor', 'name')
      .populate('patient', 'name')
      .populate('specialization', 'name');

    if (!originalAppointment) {
      return res.status(404).json({ msg: 'Original appointment not found' });
    }

    // Extract patient and specialization information from the original appointment
    const patientId = originalAppointment.patient._id;
    const specializationId = originalAppointment.specialization._id;

    // Create a new ObjectId for schedule ID and selected slot ID
    const scheduleId = new mongoose.Types.ObjectId(schedule_id);
    const slotId = selectedSlot.id;

    // Find the doctor based on the doctor ID
    const doctor = await Doctor.findById(doctorId)
      .populate('specializations.specializationId', 'name description');

    if (!doctor) {
      return res.status(404).json({ msg: 'Doctor not found' });
    }

    const specialization = doctor.specializations.find(spec =>
      spec.specializationId.equals(specializationId)
    );

    if (!specialization) {
      return res.status(400).json({ msg: 'Doctor does not have the required specialization' });
    }

    const schedule = specialization.schedules.find(sch =>
      sch._id.equals(scheduleId) && sch.day === day
    );

    if (!schedule) {
      return res.status(400).json({ msg: 'Invalid schedule ID or doctor does not work on the selected day.' });
    }

    const slot = schedule.slots.find(slot =>
      slot._id.toString() === slotId.toString()
    );

    if (!slot || !slot.isAvailable) {
      return res.status(400).json({ msg: 'Selected slot is no longer available.' });
    }

    // Fetch existing appointments that overlap with the selected slot
    const overlappingAppointments = await Appointment.find({
      doctor: doctorId,
      day,
      schedule: scheduleId,
      $and: [
        { 'timeSlot.end': { $gt: slot.start } },
        { 'timeSlot.start': { $lt: slot.end } }
      ]
    });

    const overlappingBreaks = await Break.find({
      doctor: doctorId,
      day,
      $and: [
        { endTime: { $gt: slot.start } },
        { startTime: { $lt: slot.end } }
      ]
    });

    if (overlappingAppointments.length > 0 || overlappingBreaks.length > 0) {
      return res.status(400).json({ msg: 'Selected slot is no longer available due to overlapping appointment or break.' });
    }

    // Create a new appointment for the follow-up
    const newAppointment = new Appointment({
      doctor: doctorId,
      patient: patientId,
      day,
      timeSlot: { id: slotId, start: slot.start, end: slot.end },
      specialization: specializationId,
      schedule: scheduleId
    });

    await newAppointment.save();

    // Update the slot's availability
    const updateResult = await Doctor.updateOne(
      { _id: doctorId, 'specializations.schedules._id': scheduleId },
      {
        $set: { 'specializations.$.schedules.$[elem].slots.$[slot].isAvailable': false }
      },
      {
        arrayFilters: [
          { 'elem._id': scheduleId },
          { 'slot._id': slotId }
        ]
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({ msg: 'Failed to update slot availability.' });
    }

    res.status(201).json({ msg: 'Follow-up appointment scheduled successfully', appointment: newAppointment });

  } catch (error) {
    console.error('Error scheduling follow-up appointment:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};


const handleDoctorFees = async (req, res) => {
  const { doctorId } = req.params;

  try {
    // Find the doctor by ID
    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      return res.status(404).json({ msg: 'Doctor not found' });
    }

    // Handle GET request (Retrieve Doctor Fees)
    if (req.method === 'GET') {
      if (!doctor.advanceFee || !doctor.fullFee) {
        return res.status(404).json({ msg: 'Doctor fees not found' });
      }
      return res.status(200).json({ advanceFee: doctor.advanceFee, fullFee: doctor.fullFee });
    }

    // Handle PUT request (Update Doctor Fees)
    if (req.method === 'PUT') {
      const { advanceFee, fullFee } = req.body;

      // Validate request body
      if (!advanceFee || !fullFee) {
        return res.status(400).json({ msg: 'Advance fee and full fee are required' });
      }

      // Ensure only authorized users can update fees
      const userRole = req.user.role;
      if (userRole !== 'Admin' && userRole !== 'Doctor') {
        return res.status(403).json({ msg: 'Unauthorized' });
      }

      // Validate fee values
      if (typeof advanceFee !== 'number' || typeof fullFee !== 'number') {
        return res.status(400).json({ msg: 'Advance fee and full fee must be numbers' });
      }

      // Update advance and full fees
      doctor.advanceFee = advanceFee;
      doctor.fullFee = fullFee;

      try {
        await doctor.save();
        return res.status(200).json({ msg: 'Doctor fees updated successfully', doctor });
      } catch (saveError) {
        return res.status(500).json({ msg: 'Failed to update doctor fees', error: saveError.message });
      }
    }

    // If not GET or PUT, return method not allowed
    return res.status(405).json({ msg: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling doctor fees:', error);
    return res.status(500).json({ msg: 'Server error', error: error.message });
  }
};




async function updateSlots() {
  try {
    const nowLocal = new Date();
    const currentTimeString = nowLocal.toTimeString().split(' ')[0].slice(0, 5);
    const currentDayLocal = nowLocal.toLocaleDateString('en-US', { weekday: 'long' });

    console.log('Current Server Time (Local):', currentTimeString);

    const doctors = await Doctor.find();

    const updatePromises = [];
    const updatedSlots = [];

    for (let doctor of doctors) {
      for (let specialization of doctor.specializations) {
        const schedule = specialization.schedules.find(s => s.day === currentDayLocal);

        if (schedule) {
          console.log(`Slots before update for doctor ${doctor._id} on ${currentDayLocal}:`, schedule.slots);

          // Find slots that need to be updated (past the end time and still available)
          const slotsToUpdate = schedule.slots.filter(slot => currentTimeString > slot.end && slot.isAvailable);

          for (let slot of slotsToUpdate) {
            // Update the slot's availability and timestamp
            const updatePromise = Doctor.findOneAndUpdate(
              {
                _id: doctor._id,
                'specializations.specializationId': specialization.specializationId,
                'specializations.schedules.day': schedule.day,
                'specializations.schedules.slots.start': slot.start
              },
              {
                $set: {
                  'specializations.$[spec].schedules.$[sched].slots.$[s].isAvailable': false,
                  updatedAt: nowLocal // Ensure the timestamp is updated
                }
              },
              {
                arrayFilters: [
                  { 'spec.specializationId': specialization.specializationId },
                  { 'sched.day': schedule.day },
                  { 's.start': slot.start }
                ],
                new: true,
                runValidators: true
              }
            );

            updatePromises.push(updatePromise);

            // Log the updated slot information
            updatedSlots.push({
              doctorId: doctor._id,
              specializationId: specialization.specializationId,
              scheduleDay: schedule.day,
              slotStart: slot.start,
              slotEnd: slot.end,
            });
          }
        }
      }
    }

    // Execute all update promises concurrently
    await Promise.all(updatePromises);

    // Check the slots after updates
    const updatedDoctors = await Doctor.find();
    console.log('Slots after update:', updatedDoctors);

    if (updatedSlots.length > 0) {
      console.log('Updated slots:', updatedSlots);
    } else {
      console.log('No slots were updated.');
    }

    return updatedSlots;
  } catch (error) {
    console.error('Error updating slot availability:', error);
  }
}



// Schedule the updateSlots function to run every minute using cron
//cron.schedule('* * * * *', () => {
  //console.log('Running updateSlots every minute');
  //updateSlots();
//});


async function resetSlotAvailability() {
  try {
    // Fetch all doctors
    const doctors = await Doctor.find();

    // Array to store updates for batch processing
    const updatePromises = [];

    // Iterate through all doctors
    for (let doctor of doctors) {
      for (let specialization of doctor.specializations) {
        for (let schedule of specialization.schedules) {
          // Collect all slots that need to be reset to available
          const slotsToReset = schedule.slots.filter(slot => !slot.isAvailable); // Only reset slots that are marked unavailable

          if (slotsToReset.length > 0) {
            // Batch update for this specialization's slots to reset availability
            const updatePromise = Doctor.findOneAndUpdate(
              { _id: doctor._id, 'specializations.specializationId': specialization.specializationId, 'specializations.schedules.day': schedule.day },
              {
                $set: {
                  'specializations.$[spec].schedules.$[sched].slots.$[s].isAvailable': true
                }
              },
              {
                arrayFilters: [
                  { 'spec.specializationId': specialization.specializationId },
                  { 'sched.day': schedule.day },
                  { 's.isAvailable': false } // Only reset slots that are not available
                ],
                new: true,
                runValidators: true
              }
            );

            updatePromises.push(updatePromise);
          }
        }
      }
    }

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    // Log that slots were reset
    console.log('Slot availability has been reset for the day.');
  } catch (error) {
    console.error('Error resetting slot availability:', error);
  }
}

// Schedule the job to run every day at midnight
cron.schedule('0 0 * * *', () => {
  resetSlotAvailability();
  console.log('Scheduled task executed: Resetting slot availability.');
});




module.exports = { registerDoctor, updateDoctorDetails,appointmentHistory,treatmentPlan,updateTreatment, 
  createArticle, getMyArticles, updateArticle,  deleteArticle, scheduleFollowUpAppointment,handleDoctorFees}; 
