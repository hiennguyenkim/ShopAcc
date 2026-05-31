const CardRecharge = require('../models/CardRecharge');
const BankRecharge = require('../models/BankRecharge');
const User = require('../models/User');
const createAuditLog = require('../utils/createAuditLog');

// POST /api/wallet/recharge-card
const rechargeCard = async (req, res, next) => {
  try {
    const { provider, denomination, serial, code } = req.body;
    const userId = req.user._id;

    if (!provider || !denomination || !serial || !code) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin thẻ cào.' });
    }

    const newRecharge = await CardRecharge.create({
      user: userId,
      provider: provider.toLowerCase(),
      denomination: Number(denomination),
      serial,
      code,
      status: 'pending'
    });

    await createAuditLog(
      userId,
      'RECHARGE_CARD_REQUEST',
      `Yêu cầu nạp thẻ cào ${provider.toUpperCase()} mệnh giá ${Number(denomination).toLocaleString('vi-VN')}đ. Serial: ${serial}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Gửi yêu cầu nạp thẻ cào thành công. Đang chờ phê duyệt.',
      recharge: newRecharge
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/wallet/recharge-bank
const rechargeBank = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const userId = req.user._id;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Số tiền nạp chuyển khoản không hợp lệ.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng tải lên ảnh minh chứng chuyển khoản.' });
    }

    const proofImage = `/uploads/recharges/${req.file.filename}`;

    const newRecharge = await BankRecharge.create({
      user: userId,
      amount: Number(amount),
      proofImage,
      status: 'pending'
    });

    await createAuditLog(
      userId,
      'RECHARGE_BANK_REQUEST',
      `Yêu cầu nạp chuyển khoản số tiền ${Number(amount).toLocaleString('vi-VN')}đ.`,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Gửi thông tin chuyển khoản thành công. Đang chờ xác nhận.',
      recharge: newRecharge
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/wallet/admin/cards (Admin only)
const getCardRecharges = async (req, res, next) => {
  try {
    const recharges = await CardRecharge.find()
      .populate('user', 'fullName username email phone')
      .populate('processedBy', 'fullName username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: recharges.length,
      recharges
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/wallet/admin/banks (Admin only)
const getBankRecharges = async (req, res, next) => {
  try {
    const recharges = await BankRecharge.find()
      .populate('user', 'fullName username email phone')
      .populate('processedBy', 'fullName username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: recharges.length,
      recharges
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/wallet/admin/card/:id (Admin only)
const processCardRecharge = async (req, res, next) => {
  try {
    const { action, reason } = req.body; // action: 'approved', 'rejected', 'duplicate'
    const adminId = req.user._id;

    if (!['approved', 'rejected', 'duplicate'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Hành động ví không hợp lệ.' });
    }

    const recharge = await CardRecharge.findById(req.params.id);
    if (!recharge) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu nạp thẻ.' });
    }

    if (recharge.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Yêu cầu này đã được xử lý trước đó.' });
    }

    recharge.status = action;
    recharge.processedBy = adminId;
    recharge.processedAt = new Date();
    await recharge.save();

    const targetUser = await User.findById(recharge.user);

    if (action === 'approved') {
      targetUser.balance += recharge.denomination;
      targetUser.totalDeposited += recharge.denomination;
      targetUser.lastDepositAt = new Date();
      await targetUser.save();

      await createAuditLog(
        adminId,
        'APPROVE_CARD_RECHARGE',
        `Phê duyệt thẻ cào thành công. Cộng ${recharge.denomination.toLocaleString('vi-VN')}đ cho user ${targetUser.username}.`,
        req.ip
      );
    } else {
      await createAuditLog(
        adminId,
        'REJECT_CARD_RECHARGE',
        `Từ chối yêu cầu thẻ cào của ${targetUser.username} (Trạng thái: ${action}). Lý do: ${reason || 'Không có'}`,
        req.ip
      );
    }

    res.status(200).json({
      success: true,
      message: `Xử lý yêu cầu nạp thẻ thành công (${action}).`,
      recharge
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/wallet/admin/bank/:id (Admin only)
const processBankRecharge = async (req, res, next) => {
  try {
    const { action, note } = req.body; // action: 'approved', 'rejected'
    const adminId = req.user._id;

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Hành động không hợp lệ.' });
    }

    const recharge = await BankRecharge.findById(req.params.id);
    if (!recharge) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu nạp chuyển khoản.' });
    }

    if (recharge.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Yêu cầu này đã được xử lý trước đó.' });
    }

    recharge.status = action;
    recharge.processedBy = adminId;
    recharge.note = note || '';
    await recharge.save();

    const targetUser = await User.findById(recharge.user);

    if (action === 'approved') {
      targetUser.balance += recharge.amount;
      targetUser.totalDeposited += recharge.amount;
      targetUser.lastDepositAt = new Date();
      await targetUser.save();

      await createAuditLog(
        adminId,
        'APPROVE_BANK_RECHARGE',
        `Phê duyệt chuyển khoản thành công. Cộng ${recharge.amount.toLocaleString('vi-VN')}đ cho user ${targetUser.username}.`,
        req.ip
      );
    } else {
      await createAuditLog(
        adminId,
        'REJECT_BANK_RECHARGE',
        `Từ chối yêu cầu chuyển khoản của ${targetUser.username}. Lý do: ${note || 'Không có'}`,
        req.ip
      );
    }

    res.status(200).json({
      success: true,
      message: `Xử lý yêu cầu nạp chuyển khoản thành công (${action}).`,
      recharge
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  rechargeCard,
  rechargeBank,
  getCardRecharges,
  getBankRecharges,
  processCardRecharge,
  processBankRecharge
};
