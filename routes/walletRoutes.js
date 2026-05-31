const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Client recharges
router.post('/recharge-card', authMiddleware, walletController.rechargeCard);
router.post('/recharge-bank', authMiddleware, upload.single('proofImage'), walletController.rechargeBank);

// Admin controls
router.get('/admin/cards', authMiddleware, requireAdmin, walletController.getCardRecharges);
router.get('/admin/banks', authMiddleware, requireAdmin, walletController.getBankRecharges);
router.put('/admin/card/:id', authMiddleware, requireAdmin, walletController.processCardRecharge);
router.put('/admin/bank/:id', authMiddleware, requireAdmin, walletController.processBankRecharge);

module.exports = router;
