const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAuth } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getMe);
router.put('/change-password', authMiddleware, requireAuth, authController.changePassword);
router.put('/profile', authMiddleware, requireAuth, authController.updateProfile);
router.post('/upload-avatar', authMiddleware, requireAuth, upload.single('avatar'), authController.uploadAvatar);
router.post('/forgot-password', authController.forgotPassword);

module.exports = router;
