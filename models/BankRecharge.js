const mongoose = require('mongoose');

const bankRechargeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  proofImage: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('BankRecharge', bankRechargeSchema);
