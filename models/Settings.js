const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  applicationName: { type: String, required: true },
  companyName: { type: String, required: true },
  hospitalEmail: { type: String, required: true },
  hospitalPhone: { type: String, required: true },
  hospitalStartDay: { type: String, required: true },
  hospitalStartTime: { type: String, required: true },
  hospitalAddress: { type: String, required: true },
  countryCode: { type: String, required: true },
  defaultLanguage: { type: String, required: true },
  aboutUs: { type: String, required: true },
  applicationLogo: { data: Buffer, contentType: String }, // For storing the logo image
  favicon: { data: Buffer, contentType: String }, // For storing the favicon image
  socialDetails: { type: Map, of: String }, // Stores social links as key-value pairs
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
