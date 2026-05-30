const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  evidenceImages: [{ type: String }],
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'resolved', 'rejected'], 
    default: 'pending' 
  },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolutionNote: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Complaint', complaintSchema);
