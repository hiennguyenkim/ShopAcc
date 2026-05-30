const Complaint = require('../models/Complaint');
const Order = require('../models/Order');
const createAuditLog = require('../utils/createAuditLog');
const deleteFile = require('../utils/deleteFile');

const createComplaint = async (req, res, next) => {
  try {
    const { orderId, title, description } = req.body;
    const userId = req.user._id;

    if (!orderId || !title || !description) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin khiếu nại.' });
    }

    // Verify order owner
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Bạn không thể khiếu nại đơn hàng của người khác.' });
    }

    const evidenceImages = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        evidenceImages.push(`/uploads/complaints/${file.filename}`);
      });
    }

    const complaint = await Complaint.create({
      order: orderId,
      user: userId,
      title,
      description,
      evidenceImages,
      status: 'pending'
    });

    // Update order status to dispute
    order.orderStatus = 'dispute';
    await order.save();

    await createAuditLog(
      userId,
      'CREATE_COMPLAINT',
      `Tạo khiếu nại mới cho đơn hàng: ${order.orderCode}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Gửi khiếu nại thành công. Ban quản trị sẽ sớm xem xét giải quyết.',
      complaint
    });
  } catch (error) {
    next(error);
  }
};

const getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ user: req.user._id })
      .populate('order', 'orderCode orderStatus')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (error) {
    next(error);
  }
};

const getAllComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find()
      .populate('user', 'fullName username email phone')
      .populate('order', 'orderCode total paymentMethod orderStatus')
      .populate('resolvedBy', 'fullName username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (error) {
    next(error);
  }
};

const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('user', 'fullName username email phone')
      .populate('order', 'orderCode total paymentMethod items orderStatus')
      .populate('resolvedBy', 'fullName username');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khiếu nại.' });
    }

    const isOwner = complaint.user._id.toString() === req.user._id.toString();
    const isStaffOrAdmin = req.user.role === 'staff' || req.user.role === 'admin';

    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem khiếu nại này.' });
    }

    res.status(200).json({
      success: true,
      complaint
    });
  } catch (error) {
    next(error);
  }
};

const resolveComplaint = async (req, res, next) => {
  try {
    const { status, resolutionNote } = req.body;
    if (!['processing', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái giải quyết không hợp lệ.' });
    }

    const complaint = await Complaint.findById(req.params.id).populate('order');
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khiếu nại.' });
    }

    complaint.status = status;
    complaint.resolutionNote = resolutionNote;
    complaint.resolvedBy = req.user._id;
    await complaint.save();

    // If resolved or rejected, we might want to update the order status
    if (status === 'resolved') {
      complaint.order.orderStatus = 'refunded';
      await complaint.order.save();
      // If paymentMethod is balance, trigger auto refund
      if (complaint.order.paymentMethod === 'balance') {
        await User.updateOne({ _id: complaint.order.user }, { $inc: { balance: complaint.order.total } });
      }
    } else if (status === 'rejected') {
      // Revert order status from dispute back to completed
      complaint.order.orderStatus = 'completed';
      await complaint.order.save();
    }

    await createAuditLog(
      req.user._id,
      'RESOLVE_COMPLAINT',
      `Giải quyết khiếu nại ID: ${complaint._id} trạng thái ${status}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái giải quyết khiếu nại thành công.',
      complaint
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  getComplaintById,
  resolveComplaint
};
