const mongoose = require('mongoose');
const Break = require('./Break');
const bcrypt = require('bcryptjs');

const DoctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: 'doctor',
  },
  isVerified: {
    type: Boolean,
    default: true, 
  },
  specializations: [{
    specializationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Specialization',
      required: true,
    },
    schedules: [{
      day: {
        type: String,
        required: true,
      },
      startTime: {
        type: String,
        required: true,
      },
      endTime: {
        type: String,
        required: true,
      },
      appointmentTimeLimit: {
        type: Number,
        required: true,
      },
      slots: [{
        start: {
          type: String,
          required: true,
        },
        end: {
          type: String,
          required: true,
        },
        isAvailable: {
          type: Boolean,
          default: true,
        },
      }],
    }],
  }],
  advanceFee: { type: Number, required: true },  // The advance payment amount
  fullFee: { type: Number, required: true },      // The full payment amount
  profilePicture: { 
    data: Buffer,
    contentType: String
  },
  refreshToken: { type: String, default: null },
  dateRegistered: {
    type: Date,
    default: Date.now,
  },
});

// Utility function to calculate slots
function generateSlots(startTime, endTime, appointmentTimeLimit, breaks) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const startTotalMinutes = (startHour * 60) + startMinute;
  const endTotalMinutes = (endHour * 60) + endMinute;

  const slots = [];
  let currentSlotStartMinutes = startTotalMinutes;

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
    const mins = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${mins}`;
  };

  while (currentSlotStartMinutes < endTotalMinutes) {
    const slotEndMinutes = currentSlotStartMinutes + appointmentTimeLimit;

    const isAvailable = !breaks.some(brk => {
      const brkStart = (brk.startTime.split(':').map(Number)[0] * 60) + brk.startTime.split(':').map(Number)[1];
      const brkEnd = (brk.endTime.split(':').map(Number)[0] * 60) + brk.endTime.split(':').map(Number)[1];
      return currentSlotStartMinutes < brkEnd && slotEndMinutes > brkStart;
    });

    slots.push({
      start: formatTime(currentSlotStartMinutes),
      end: formatTime(slotEndMinutes),
      isAvailable,
    });

    currentSlotStartMinutes = slotEndMinutes;
  }

  return slots;
}

// Middleware to handle slot generation before saving
DoctorSchema.pre('save', async function(next) {
  for (const specialization of this.specializations) {
    for (const schedule of specialization.schedules) {
      const breaks = await Break.find({ doctor: this._id });
      schedule.slots = generateSlots(schedule.startTime, schedule.endTime, schedule.appointmentTimeLimit, breaks);
    }
  }
  next();
});


const Doctor = mongoose.model('Doctor', DoctorSchema);
module.exports = Doctor;
