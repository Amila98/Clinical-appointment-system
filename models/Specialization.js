// models/Specialization.js
const mongoose = require('mongoose');

const specializationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
    }
});

const Specialization = mongoose.model('Specialization', specializationSchema);
module.exports = Specialization;
