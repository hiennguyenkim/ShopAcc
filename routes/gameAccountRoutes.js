const express = require('express');
const router = express.Router();
const gameAccountController = require('../controllers/gameAccountController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireStaff, requireAdmin } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', authMiddleware, gameAccountController.getGameAccounts);
router.get('/:id', authMiddleware, gameAccountController.getGameAccountById);
router.get('/slug/:slug', authMiddleware, gameAccountController.getGameAccountBySlug);

router.post('/', authMiddleware, requireAdmin, upload.array('images', 10), gameAccountController.createGameAccount);
router.put('/:id', authMiddleware, requireAdmin, upload.array('images', 10), gameAccountController.updateGameAccount);
router.delete('/:id', authMiddleware, requireAdmin, gameAccountController.deleteGameAccount);
router.put('/:id/status', authMiddleware, requireStaff, gameAccountController.updateStatus);

module.exports = router;
