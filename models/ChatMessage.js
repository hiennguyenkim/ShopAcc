const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  chatRoomId: {
    type: String, // representing a registered user's ID or a random guest session token
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderRole: {
    type: String,
    enum: ['customer', 'staff', 'admin', 'guest'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexing for fast room query
chatMessageSchema.index({ chatRoomId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
