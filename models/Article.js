const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  specialization: { type: mongoose.Schema.Types.ObjectId, ref: 'Specialization', required: true },
  content: { type: String, required: true },
  schedule_post: { type: Date },
  status: { type: String, enum: ['Draft', 'Published', 'Scheduled'], default: 'Draft' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  featureImage: {
    data: Buffer, // Binary data of the image
    contentType: String, // MIME type (e.g., image/jpeg, image/png)
},
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Article', articleSchema);
