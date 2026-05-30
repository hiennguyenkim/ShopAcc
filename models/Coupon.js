const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  discountType: { type: String, enum: ['percent', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  minOrderValue: { type: Number, default: 0, min: 0 },
  maxDiscount: { type: Number, default: 0, min: 0 }, // For percentage discount cap
  usageLimit: { type: Number, required: true, min: 1 },
  usedCount: { type: Number, default: 0, min: 0 },
  perUserLimit: { type: Number, default: 1, min: 1 },
  applyGameType: { type: String }, // optional: apply only to specific game type
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Coupon', couponSchema);
