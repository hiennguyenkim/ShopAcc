const User = require('../models/User');
const GameAccount = require('../models/GameAccount');

const getWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      select: 'name price images status gameType slug code rank level server warrantyDays'
    });

    res.status(200).json({
      success: true,
      wishlist: user.wishlist || []
    });
  } catch (error) {
    next(error);
  }
};

const toggleWishlist = async (req, res, next) => {
  try {
    const { accountId } = req.body;
    const userId = req.user._id;

    if (!accountId) {
      return res.status(400).json({ success: false, message: 'Thiếu mã tài khoản game.' });
    }

    const user = await User.findById(userId);
    const hasItem = user.wishlist.includes(accountId);

    if (hasItem) {
      await User.findByIdAndUpdate(userId, {
        $pull: { wishlist: accountId }
      });
      return res.status(200).json({
        success: true,
        action: 'removed',
        message: 'Đã xóa khỏi danh sách yêu thích.'
      });
    } else {
      const account = await GameAccount.findById(accountId);
      if (!account) {
        return res.status(404).json({ success: false, message: 'Tài khoản game không tồn tại.' });
      }
      await User.findByIdAndUpdate(userId, {
        $addToSet: { wishlist: accountId }
      });
      return res.status(200).json({
        success: true,
        action: 'added',
        message: 'Đã thêm vào danh sách yêu thích.'
      });
    }
  } catch (error) {
    next(error);
  }
};

const removeFromWishlist = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, {
      $pull: { wishlist: accountId }
    });

    res.status(200).json({
      success: true,
      message: 'Đã xóa khỏi danh sách yêu thích.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  toggleWishlist,
  removeFromWishlist
};
