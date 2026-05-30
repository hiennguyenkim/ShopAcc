const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAuth } = require('../middleware/roleMiddleware');

router.post('/add', authMiddleware, requireAuth, cartController.addToCart);

module.exports = router;
