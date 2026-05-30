const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  subject: { type: String, trim: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['unread', 'read', 'replied'], default: 'unread' }
}, {
  timestamps: true
});

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
