const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const createAuditLog = require('../utils/createAuditLog');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const register = async (req, res, next) => {
  try {
    const { fullName, username, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tên đăng nhập hoặc email đã được sử dụng.' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      username,
      email,
      phone,
      password: hashedPassword
    });

    // Create Audit Log
    await createAuditLog(newUser._id, 'REGISTER', 'Đăng ký tài khoản mới', req.ip);

    // Create token
    const token = signToken(newUser._id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Exclude password
    newUser.password = undefined;

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công.',
      user: newUser
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng cung cấp tên đăng nhập và mật khẩu.' 
      });
    }

    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ 
        success: false, 
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Tài khoản của bạn đã bị khóa.' 
      });
    }

    const token = signToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    await createAuditLog(user._id, 'LOGIN', 'Đăng nhập vào hệ thống', req.ip);

    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công.',
      user
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await createAuditLog(req.user._id, 'LOGOUT', 'Đăng xuất khỏi hệ thống', req.ip);
    }
    res.clearCookie('token');
    res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công.'
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(200).json({
        success: false,
        message: 'Chưa đăng nhập.'
      });
    }
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin mật khẩu.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới và xác nhận mật khẩu không khớp.' });
    }

    const user = await User.findById(req.user._id);

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mật khẩu hiện tại không chính xác.' 
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mật khẩu mới không được trùng với mật khẩu cũ.' 
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await createAuditLog(user._id, 'CHANGE_PASSWORD', 'Thay đổi mật khẩu tài khoản', req.ip);

    res.status(200).json({
      success: true,
      message: 'Thay đổi mật khẩu thành công.'
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, address, avatar } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ success: false, message: 'Họ tên và số điện thoại là bắt buộc.' });
    }

    const phoneRegex = /^0\d{8,10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ (phải bắt đầu bằng số 0 và có 9-11 chữ số).' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    user.fullName = fullName;
    user.phone = phone;
    if (address !== undefined) user.address = address;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    await createAuditLog(user._id, 'UPDATE_PROFILE', 'Cập nhật thông tin cá nhân', req.ip);

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin cá nhân thành công.',
      user
    });
  } catch (error) {
    next(error);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng tải lên ảnh đại diện.' });
    }
    const url = `/uploads/avatars/${req.file.filename}`;
    res.status(200).json({ success: true, url });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy tài khoản gắn liền với email này.' 
      });
    }

    // Generate random 8-character password
    const tempPassword = Math.random().toString(36).substring(2, 10);
    user.password = await bcrypt.hash(tempPassword, 10);
    await user.save();

    await createAuditLog(user._id, 'FORGOT_PASSWORD', 'Yêu cầu khôi phục mật khẩu (mật khẩu tạm cấp)', req.ip);

    // In production we would send an email. For our school project, we return the temp password.
    res.status(200).json({
      success: true,
      message: `Hệ thống đã tạo mật khẩu tạm thời. Vui lòng đăng nhập và đổi mật khẩu ngay lập tức.`,
      tempPassword // Return it for easy testing and usage in academic presentation
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  changePassword,
  updateProfile,
  uploadAvatar,
  forgotPassword
};
