const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAuth } = require('../middleware/roleMiddleware');

router.get('/', authMiddleware, requireAuth, wishlistController.getWishlist);
router.post('/toggle', authMiddleware, requireAuth, wishlistController.toggleWishlist);
router.delete('/:accountId', authMiddleware, requireAuth, wishlistController.removeFromWishlist);

module.exports = router;
