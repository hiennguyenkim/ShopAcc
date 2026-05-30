const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerInfo: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    note: { type: String }
  },
  items: [{
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'GameAccount', required: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    gameType: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    deliveredCredentials: {
      username: { type: String },
      password: { type: String },
      loginMethod: { type: String },
      linkedEmail: { type: String },
      securityNote: { type: String }
    }
  }],
  subtotal: { type: Number, required: true, min: 0 },
  discountAmount: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  coupon: {
    code: { type: String },
    discountType: { type: String, enum: ['percent', 'fixed'] },
    discountValue: { type: Number }
  },
  paymentMethod: { 
    type: String, 
    enum: ['bank_transfer', 'e_wallet', 'balance', 'cash'], 
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['unpaid', 'waiting_confirm', 'paid', 'refunded'], 
    default: 'unpaid' 
  },
  orderStatus: {
    type: String,
    enum: [
      'pending_payment', 
      'pending_confirm', 
      'paid', 
      'delivering', 
      'completed', 
      'cancelled', 
      'refunded', 
      'dispute'
    ],
    default: 'pending_payment'
  },
  paymentProof: { type: String }, // URL or path to payment screenshot
  staffNote: { type: String },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deliveredAt: { type: Date },
  completedAt: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
