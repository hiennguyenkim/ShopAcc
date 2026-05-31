const express = require('express');
const router = express.Router();
const siteSettingController = require('../controllers/siteSettingController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', siteSettingController.getSettings);
router.put('/', authMiddleware, requireAdmin, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'bannerImage', maxCount: 1 }
]), siteSettingController.updateSettings);
router.post('/upload-logo', authMiddleware, requireAdmin, upload.single('logo'), siteSettingController.uploadLogo);

module.exports = router;
