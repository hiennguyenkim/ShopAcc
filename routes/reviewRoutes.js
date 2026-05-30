const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAuth, requireStaff } = require('../middleware/roleMiddleware');

router.post('/', authMiddleware, requireAuth, reviewController.createReview);
router.get('/account/:accountId', reviewController.getReviewsByAccount);
router.delete('/:id', authMiddleware, requireAuth, reviewController.deleteReview);
router.get('/', authMiddleware, requireStaff, reviewController.getAllReviews);

module.exports = router;
