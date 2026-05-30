const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAuth, requireAdmin } = require('../middleware/roleMiddleware');

router.get('/', authMiddleware, requireAdmin, couponController.getAllCoupons);
router.post('/', authMiddleware, requireAdmin, couponController.createCoupon);
router.put('/:id', authMiddleware, requireAdmin, couponController.updateCoupon);
router.delete('/:id', authMiddleware, requireAdmin, couponController.deleteCoupon);
router.post('/apply', authMiddleware, requireAuth, couponController.applyCoupon);

module.exports = router;
