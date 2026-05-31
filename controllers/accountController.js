const User = require('../models/User');
const createAuditLog = require('../utils/createAuditLog');

const getAllAccounts = async (req, res, next) => {
  try {
    const { search, role, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (status !== undefined) {
      query.isActive = status === 'true';
    }

    const accounts = await User.find(query).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: accounts.length,
      accounts
    });
  } catch (error) {
    next(error);
  }
};

const getAccountById = async (req, res, next) => {
  try {
    const account = await User.findById(req.params.id).select('-password');
    if (!account) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }
    res.status(200).json({
      success: true,
      account
    });
  } catch (error) {
    next(error);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ.' });
    }

    const account = await User.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    // Admin cannot change their own role
    if (account._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Không thể tự hạ phân quyền của bản thân.' });
    }

    const oldRole = account.role;
    account.role = role;
    await account.save();

    await createAuditLog(
      req.user._id,
      'UPDATE_ROLE',
      `Thay đổi vai trò của user ${account.username} từ ${oldRole} sang ${role}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Cập nhật vai trò thành công.',
      account
    });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const account = await User.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    // Admin cannot disable themselves
    if (account._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Không thể tự khóa tài khoản của chính mình.' });
    }

    account.isActive = isActive;
    await account.save();

    await createAuditLog(
      req.user._id,
      'UPDATE_USER_STATUS',
      `${isActive ? 'Kích hoạt' : 'Khóa'} tài khoản của user ${account.username}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: `${isActive ? 'Mở khóa' : 'Khóa'} tài khoản thành công.`,
      account
    });
  } catch (error) {
    next(error);
  }
};

const adjustBalance = async (req, res, next) => {
  try {
    const { amount, action } = req.body; // action: 'deposit' or 'withdraw'
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Số tiền thay đổi không hợp lệ.' });
    }

    const account = await User.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    const oldBalance = account.balance;
    if (action === 'deposit') {
      account.balance += Number(amount);
      account.totalDeposited = (account.totalDeposited || 0) + Number(amount);
      account.lastDepositAt = new Date();
    } else if (action === 'withdraw') {
      if (account.balance < amount) {
        return res.status(400).json({ success: false, message: 'Số dư tài khoản không đủ để trừ.' });
      }
      account.balance -= Number(amount);
    } else {
      return res.status(400).json({ success: false, message: 'Hành động không hợp lệ (deposit hoặc withdraw).' });
    }

    await account.save();

    await createAuditLog(
      req.user._id,
      'ADJUST_BALANCE',
      `${action === 'deposit' ? 'Cộng' : 'Trừ'} ${amount.toLocaleString('vi-VN')}đ cho user ${account.username}. Số dư: ${oldBalance.toLocaleString('vi-VN')}đ -> ${account.balance.toLocaleString('vi-VN')}đ`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Điều chỉnh số dư thành công.',
      balance: account.balance
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAccounts,
  getAccountById,
  updateRole,
  updateStatus,
  adjustBalance
};
