const mongoose = require('mongoose');

const breakSchema = new mongoose.Schema({
  doctor: {  
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  day: {
    type: String,  // Day of the week or specific date
    required: true
  }
});

const Break = mongoose.model('Break', breakSchema);
module.exports = Break;
