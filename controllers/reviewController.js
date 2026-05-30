const Review = require('../models/Review');
const Order = require('../models/Order');
const createAuditLog = require('../utils/createAuditLog');

const createReview = async (req, res, next) => {
  try {
    const { gameAccountId, rating, comment } = req.body;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Đánh giá phải từ 1 đến 5 sao.' });
    }

    if (!comment || comment.trim() === '') {
      return res.status(400).json({ success: false, message: 'Nội dung đánh giá không được để trống.' });
    }

    // Verify if user bought this account
    const hasBought = await Order.findOne({
      user: userId,
      orderStatus: 'completed',
      'items.accountId': gameAccountId
    });

    if (!hasBought) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn chỉ có thể đánh giá những tài khoản game đã mua thành công.' 
      });
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({ gameAccount: gameAccountId, user: userId });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Bạn đã đánh giá tài khoản này rồi.' });
    }

    const review = await Review.create({
      gameAccount: gameAccountId,
      user: userId,
      rating,
      comment
    });

    res.status(201).json({
      success: true,
      message: 'Đăng đánh giá thành công.',
      review
    });
  } catch (error) {
    next(error);
  }
};

const getReviewsByAccount = async (req, res, next) => {
  try {
    const reviews = await Review.find({ gameAccount: req.params.accountId })
      .populate('user', 'fullName username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    next(error);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá.' });
    }

    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdminOrStaff = req.user.role === 'admin' || req.user.role === 'staff';

    if (!isOwner && !isAdminOrStaff) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa đánh giá này.' });
    }

    await Review.deleteOne({ _id: req.params.id });

    await createAuditLog(
      req.user._id,
      'DELETE_REVIEW',
      `Xóa đánh giá ID: ${review._id} của tài khoản ${review.gameAccount}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Xóa đánh giá thành công.'
    });
  } catch (error) {
    next(error);
  }
};

const getAllReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'fullName username email')
      .populate('gameAccount', 'code name gameType')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getReviewsByAccount,
  deleteReview,
  getAllReviews
};
