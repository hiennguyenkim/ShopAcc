const SiteSetting = require('../models/SiteSetting');
const createAuditLog = require('../utils/createAuditLog');
const deleteFile = require('../utils/deleteFile');

const getSettings = async (req, res, next) => {
  try {
    let settings = await SiteSetting.findOne();
    if (!settings) {
      // Create default
      settings = await SiteSetting.create({});
    }
    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    let settings = await SiteSetting.findOne();
    if (!settings) {
      settings = await SiteSetting.create({});
    }

    const {
      bannerTitle,
      bannerSubtitle,
      contactPhone,
      contactEmail,
      address,
      facebookUrl,
      youtubeUrl,
      bankInfo,
      momoInfo,
      zaloLink,
      facebookLink,
      tiktokLink
    } = req.body;

    if (bannerTitle !== undefined) settings.bannerTitle = bannerTitle;
    if (bannerSubtitle !== undefined) settings.bannerSubtitle = bannerSubtitle;
    if (contactPhone !== undefined) settings.contactPhone = contactPhone;
    if (contactEmail !== undefined) settings.contactEmail = contactEmail;
    if (address !== undefined) settings.address = address;
    if (facebookUrl !== undefined) settings.facebookUrl = facebookUrl;
    if (youtubeUrl !== undefined) settings.youtubeUrl = youtubeUrl;
    if (zaloLink !== undefined) settings.zaloLink = zaloLink;
    if (facebookLink !== undefined) settings.facebookLink = facebookLink;
    if (tiktokLink !== undefined) settings.tiktokLink = tiktokLink;

    if (bankInfo) {
      const parsedBank = typeof bankInfo === 'string' ? JSON.parse(bankInfo) : bankInfo;
      settings.bankInfo = { ...settings.bankInfo, ...parsedBank };
    }

    if (momoInfo) {
      const parsedMomo = typeof momoInfo === 'string' ? JSON.parse(momoInfo) : momoInfo;
      settings.momoInfo = { ...settings.momoInfo, ...parsedMomo };
    }

    // Process file uploads (logo & bannerImage)
    if (req.files) {
      if (req.files.logo && req.files.logo.length > 0) {
        if (settings.logo && settings.logo !== '/images/logo.png') {
          deleteFile(settings.logo);
        }
        settings.logo = `/uploads/banners/${req.files.logo[0].filename}`;
      }

      if (req.files.bannerImage && req.files.bannerImage.length > 0) {
        if (settings.bannerImage) {
          deleteFile(settings.bannerImage);
        }
        settings.bannerImage = `/uploads/banners/${req.files.bannerImage[0].filename}`;
      }
    }

    await settings.save();

    await createAuditLog(req.user._id, 'UPDATE_SITE_SETTINGS', 'Cập nhật cài đặt hệ thống', req.ip);

    res.status(200).json({
      success: true,
      message: 'Cập nhật cài đặt hệ thống thành công.',
      settings
    });
  } catch (error) {
    next(error);
  }
};

const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file logo.' });
    }
    const url = `/uploads/logos/${req.file.filename}`;
    res.status(200).json({
      success: true,
      message: 'Tải logo lên thành công.',
      url
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  uploadLogo
};
