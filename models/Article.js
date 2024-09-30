const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  specialization: { type: mongoose.Schema.Types.ObjectId, ref: 'Specialization', required: true },
  content: { type: String, required: true },
  schedule_post: { type: Date },
  status: { type: String, enum: ['Draft', 'Published', 'Scheduled'], default: 'Draft' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  featurImage: { data: Buffer, contentType: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Article', articleSchema);
