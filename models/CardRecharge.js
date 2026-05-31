const mongoose = require('mongoose');

const cardRechargeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: String, required: true, enum: ['viettel', 'mobifone', 'vinaphone', 'vietnamobile'] },
  denomination: { type: Number, required: true },
  serial: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'duplicate'], default: 'pending' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('CardRecharge', cardRechargeSchema);
