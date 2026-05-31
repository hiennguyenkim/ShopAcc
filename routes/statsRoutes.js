const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

router.get('/overview', authMiddleware, requireAdmin, statsController.getOverview);
router.get('/revenue-chart', authMiddleware, requireAdmin, statsController.getRevenueChart);
router.get('/by-category', authMiddleware, requireAdmin, statsController.getByCategory);
router.get('/top-depositors', statsController.getTopDepositors);

module.exports = router;
