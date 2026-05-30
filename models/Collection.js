const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  description: { type: String },
  thumbnail: { type: String },
  accounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GameAccount' }],
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Collection', collectionSchema);
