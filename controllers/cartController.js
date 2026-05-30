const User = require('../models/User');
const GameAccount = require('../models/GameAccount');

const addToCart = async (req, res, next) => {
  try {
    const { accountId } = req.body;
    const userId = req.user._id;

    if (!accountId) {
      return res.status(400).json({ success: false, message: 'Thiếu mã tài khoản game.' });
    }

    const account = await GameAccount.findOne({ _id: accountId, status: 'available', isActive: true });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Tài khoản game không tồn tại hoặc đã bán.' });
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { cart: accountId }
    });

    res.status(200).json({
      success: true,
      message: 'Đã thêm tài khoản vào giỏ hàng.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addToCart
};
