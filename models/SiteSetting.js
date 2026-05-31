const mongoose = require('mongoose');

const siteSettingSchema = new mongoose.Schema({
  logo: { type: String, default: '/images/logo.png' },
  bannerImage: { type: String, default: '' },
  bannerTitle: { type: String, default: 'Hệ thống mua bán Nick Game uy tín hàng đầu' },
  bannerSubtitle: { type: String, default: 'Giao dịch tự động - Bảo mật tuyệt đối - Support 24/7' },
  contactPhone: { type: String, default: '0123456789' },
  contactEmail: { type: String, default: 'contact@gamenick.com' },
  address: { type: String, default: 'Hà Nội, Việt Nam' },
  facebookUrl: { type: String, default: '' },
  youtubeUrl: { type: String, default: '' },
  bankInfo: {
    ownerName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    qrTemplate: { type: String, default: 'https://img.vietqr.io/image/{bankName}-{accountNumber}-compact.jpg?amount={amount}&addInfo={addInfo}' }
  },
  momoInfo: {
    ownerName: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    qrTemplate: { type: String, default: '' }
  },
  zaloLink: { type: String, default: '' },
  facebookLink: { type: String, default: '' },
  tiktokLink: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('SiteSetting', siteSettingSchema);
