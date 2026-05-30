const mongoose = require('mongoose');
const { encrypt } = require('../utils/cryptoHelper');

const gameAccountSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  gameType: { 
    type: String, 
    required: true,
    enum: ['lien_quan', 'free_fire', 'fifa_mobile', 'lol', 'pubg'] 
  },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  images: [{ type: String }],
  videoUrl: { type: String },
  price: { type: Number, required: true, min: 0 },
  oldPrice: { type: Number, min: 0 },
  description: { type: String },
  rank: { type: String },
  level: { type: String },
  server: { type: String },
  accountType: { type: String },
  loginInfo: {
    username: { type: String, required: true },
    password: { type: String, required: true },
    loginMethod: { type: String, default: 'direct' }, // e.g. Facebook, Garena, Riot
    linkedEmail: { type: String },
    securityNote: { type: String }
  },
  lienQuanInfo: {
    heroCount: { type: Number, default: 0 },
    skinCount: { type: Number, default: 0 },
    skinACount: { type: Number, default: 0 },
    skinSCount: { type: Number, default: 0 },
    skinSSCount: { type: Number, default: 0 },
    rareSkins: [{ type: String }],
    runeInfo: { type: String },
    quanHuy: { type: Number, default: 0 },
    ruby: { type: Number, default: 0 }
  },
  freeFireInfo: {
    characterCount: { type: Number, default: 0 },
    outfitCount: { type: Number, default: 0 },
    gunSkinCount: { type: Number, default: 0 },
    petCount: { type: Number, default: 0 },
    diamond: { type: Number, default: 0 },
    rareItems: [{ type: String }]
  },
  fifaInfo: {
    ovr: { type: Number, default: 0 },
    teamValue: { type: Number, default: 0 },
    playerCount: { type: Number, default: 0 },
    rarePlayers: [{ type: String }],
    coins: { type: Number, default: 0 },
    fcPoints: { type: Number, default: 0 },
    formation: { type: String }
  },
  lolInfo: {
    championCount: { type: Number, default: 0 },
    skinCount: { type: Number, default: 0 },
    rareSkins: [{ type: String }],
    rp: { type: Number, default: 0 },
    blueEssence: { type: Number, default: 0 },
    wardSkins: [{ type: String }],
    icons: [{ type: String }]
  },
  pubgInfo: {
    outfitCount: { type: Number, default: 0 },
    gunSkinCount: { type: Number, default: 0 },
    vehicleSkinCount: { type: Number, default: 0 },
    uc: { type: Number, default: 0 },
    rareItems: [{ type: String }]
  },
  warrantyDays: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['available', 'reserved', 'sold', 'hidden', 'checking', 'error'], 
    default: 'available' 
  },
  reservedUntil: { type: Date },
  isActive: { type: Boolean, default: true },
  soldAt: { type: Date }
}, {
  timestamps: true
});

// Pre-save hook to encrypt password
gameAccountSchema.pre('save', function(next) {
  if (this.isModified('loginInfo.password')) {
    const pwd = this.loginInfo.password;
    // Only encrypt if it is not already encrypted (does not contain ':')
    if (pwd && !pwd.includes(':')) {
      this.loginInfo.password = encrypt(pwd);
    }
  }
  next();
});

module.exports = mongoose.model('GameAccount', gameAccountSchema);
