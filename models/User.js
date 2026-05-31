const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { 
    type: String, 
    required: true,
    match: [/^0\d{8,10}$/, 'Số điện thoại không hợp lệ'] 
  },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'staff', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  balance: { type: Number, default: 0 },
  avatar: { type: String, default: '' },
  totalDeposited: { type: Number, default: 0 },
  lastDepositAt: { type: Date },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GameAccount' }],
  cart: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GameAccount' }]
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
