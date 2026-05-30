const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireStaff, requireAdmin } = require('../middleware/roleMiddleware');

router.get('/', authMiddleware, requireStaff, accountController.getAllAccounts);
router.get('/:id', authMiddleware, requireStaff, accountController.getAccountById);
router.put('/:id/role', authMiddleware, requireAdmin, accountController.updateRole);
router.put('/:id/status', authMiddleware, requireAdmin, accountController.updateStatus);
router.put('/:id/balance', authMiddleware, requireAdmin, accountController.adjustBalance);

module.exports = router;
