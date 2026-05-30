const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập tài khoản.' });
  }
  next();
};

const requireStaff = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập tài khoản.' });
  }
  if (req.user.role !== 'staff' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho nhân viên hoặc quản trị viên.' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập tài khoản.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Quyền truy cập bị từ chối. Chỉ dành cho quản trị viên.' });
  }
  next();
};

module.exports = {
  requireAuth,
  requireStaff,
  requireAdmin
};
