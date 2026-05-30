const Order = require('../models/Order');
const GameAccount = require('../models/GameAccount');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const generateOrderCode = require('../utils/generateOrderCode');
const calculateDiscount = require('../utils/calculateDiscount');
const createAuditLog = require('../utils/createAuditLog');
const deleteFile = require('../utils/deleteFile');

const createOrder = async (req, res, next) => {
  const reservedAccountIds = [];
  try {
    const { customerInfo, items, couponCode, paymentMethod } = req.body;
    const userId = req.user._id;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng không có sản phẩm.' });
    }

    // Step 1: Reserve accounts using atomic lock
    const reservedTimeoutMinutes = Number(process.env.RESERVED_TIMEOUT_MINUTES) || 15;
    const reservedUntil = new Date(Date.now() + reservedTimeoutMinutes * 60 * 1000);

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      // Find game account and update status to reserved atomically
      const updatedAccount = await GameAccount.findOneAndUpdate(
        { 
          _id: item.accountId, 
          status: 'available', 
          isActive: true 
        },
        { 
          status: 'reserved', 
          reservedUntil 
        },
        { new: true }
      );

      if (!updatedAccount) {
        // Rollback reserved items
        if (reservedAccountIds.length > 0) {
          await GameAccount.updateMany(
            { _id: { $in: reservedAccountIds } },
            { status: 'available', $unset: { reservedUntil: '' } }
          );
        }
        return res.status(400).json({ 
          success: false, 
          message: `Nick ${item.code || 'đã chọn'} vừa được mua hoặc đang được giữ chỗ bởi người khác.` 
        });
      }

      reservedAccountIds.push(updatedAccount._id);

      orderItems.push({
        accountId: updatedAccount._id,
        code: updatedAccount.code,
        name: updatedAccount.name,
        gameType: updatedAccount.gameType,
        image: updatedAccount.images[0] || '',
        price: updatedAccount.price,
        subtotal: updatedAccount.price
      });

      subtotal += updatedAccount.price;
    }

    // Step 2: Handle coupons
    let discountAmount = 0;
    let couponDetails = undefined;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon) {
        const discountResult = calculateDiscount(coupon, subtotal);
        if (discountResult.valid) {
          discountAmount = discountResult.discountAmount;
          couponDetails = {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue
          };

          // Increment coupon used count
          coupon.usedCount += 1;
          await coupon.save();
        }
      }
    }

    const total = subtotal - discountAmount;
    const orderCode = generateOrderCode();

    const orderData = {
      orderCode,
      user: userId,
      customerInfo,
      items: orderItems,
      subtotal,
      discountAmount,
      total,
      coupon: couponDetails,
      paymentMethod,
      paymentStatus: 'unpaid',
      orderStatus: 'pending_payment'
    };

    // Step 3: Handle instant payment if method is 'balance'
    if (paymentMethod === 'balance') {
      const user = await User.findById(userId);
      if (user.balance < total) {
        // Rollback reservations and coupon usage
        await GameAccount.updateMany(
          { _id: { $in: reservedAccountIds } },
          { status: 'available', $unset: { reservedUntil: '' } }
        );
        if (couponCode) {
          await Coupon.updateOne({ code: couponCode.toUpperCase() }, { $inc: { usedCount: -1 } });
        }
        return res.status(400).json({ success: false, message: 'Số dư tài khoản không đủ để thanh toán.' });
      }

      // Deduct balance atomically
      const updatedUser = await User.findOneAndUpdate(
        { _id: userId, balance: { $gte: total } },
        { $inc: { balance: -total } },
        { new: true }
      );

      if (!updatedUser) {
        // Rollback reservations and coupon usage
        await GameAccount.updateMany(
          { _id: { $in: reservedAccountIds } },
          { status: 'available', $unset: { reservedUntil: '' } }
        );
        if (couponCode) {
          await Coupon.updateOne({ code: couponCode.toUpperCase() }, { $inc: { usedCount: -1 } });
        }
        return res.status(400).json({ success: false, message: 'Thanh toán bằng số dư ví thất bại.' });
      }

      orderData.paymentStatus = 'paid';
      orderData.orderStatus = 'completed'; // Directly deliver for balance purchase
      orderData.completedAt = new Date();
      orderData.deliveredAt = new Date();

      // Update GameAccounts status to sold
      await GameAccount.updateMany(
        { _id: { $in: reservedAccountIds } },
        { status: 'sold', soldAt: new Date(), $unset: { reservedUntil: '' } }
      );

      await createAuditLog(
        userId,
        'PURCHASE_BALANCE',
        `Mua nick bằng số dư ví. Mã đơn: ${orderCode}. Số tiền: -${total.toLocaleString('vi-VN')}đ.`,
        req.ip
      );
    }

    const order = await Order.create(orderData);

    await createAuditLog(userId, 'CREATE_ORDER', `Tạo đơn hàng mới: ${orderCode}`, req.ip);

    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công.',
      order
    });
  } catch (error) {
    // General rollback if any error occurs
    if (reservedAccountIds.length > 0) {
      await GameAccount.updateMany(
        { _id: { $in: reservedAccountIds } },
        { status: 'available', $unset: { reservedUntil: '' } }
      );
    }
    next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const { search, orderStatus, paymentStatus } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { orderCode: { $regex: search, $options: 'i' } },
        { 'customerInfo.fullName': { $regex: search, $options: 'i' } },
        { 'customerInfo.phone': { $regex: search, $options: 'i' } }
      ];
    }

    if (orderStatus) query.orderStatus = orderStatus;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const orders = await Order.find(query)
      .populate('user', 'fullName username email')
      .populate('handledBy', 'fullName username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('handledBy', 'fullName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'fullName username email phone')
      .populate('handledBy', 'fullName username');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    const isOwner = order.user._id.toString() === req.user._id.toString();
    const isStaffOrAdminUser = req.user.role === 'staff' || req.user.role === 'admin';

    if (!isOwner && !isStaffOrAdminUser) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem đơn hàng này.' });
    }

    // Convert order to plain object to attach credentials safely
    const orderObj = order.toObject();

    // Attach account login credentials ONLY if order is completed OR viewer is staff/admin
    const showCredentials = order.orderStatus === 'completed' || isStaffOrAdminUser;

    for (let i = 0; i < orderObj.items.length; i++) {
      const item = orderObj.items[i];
      if (showCredentials) {
        const fullAccount = await GameAccount.findById(item.accountId);
        if (fullAccount) {
          item.loginInfo = fullAccount.loginInfo;
        }
      }
    }

    res.status(200).json({
      success: true,
      order: orderObj
    });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus, paymentStatus, staffNote } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    const oldStatus = order.orderStatus;
    const accountIds = order.items.map(item => item.accountId);

    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (staffNote !== undefined) order.staffNote = staffNote;

    order.handledBy = req.user._id;

    // Handle account state transitions based on order state changes
    if (orderStatus === 'completed') {
      order.completedAt = new Date();
      if (!order.deliveredAt) order.deliveredAt = new Date();
      
      // Permanently mark accounts as sold
      await GameAccount.updateMany(
        { _id: { $in: accountIds } },
        { status: 'sold', soldAt: new Date(), $unset: { reservedUntil: '' } }
      );
    } else if (orderStatus === 'cancelled') {
      // Revert accounts back to available
      await GameAccount.updateMany(
        { _id: { $in: accountIds } },
        { status: 'available', $unset: { reservedUntil: '' } }
      );
      
      // Rollback coupon count if any
      if (order.coupon && order.coupon.code) {
        await Coupon.updateOne({ code: order.coupon.code }, { $inc: { usedCount: -1 } });
      }
    } else if (orderStatus === 'refunded') {
      // Revert accounts to available or error depending on reason
      await GameAccount.updateMany(
        { _id: { $in: accountIds } },
        { status: 'available', $unset: { reservedUntil: '' } }
      );

      // Refund user balance if they paid with wallet
      if (order.paymentMethod === 'balance' && order.paymentStatus === 'paid') {
        await User.updateOne({ _id: order.user }, { $inc: { balance: order.total } });
      }
    } else if (orderStatus === 'delivering' || orderStatus === 'paid') {
      // Mark account as sold
      await GameAccount.updateMany(
        { _id: { $in: accountIds } },
        { status: 'sold', $unset: { reservedUntil: '' } }
      );
    }

    await order.save();

    await createAuditLog(
      req.user._id,
      'UPDATE_ORDER_STATUS',
      `Cập nhật trạng thái đơn ${order.orderCode} từ ${oldStatus} sang ${orderStatus || oldStatus}.`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công.',
      order
    });
  } catch (error) {
    next(error);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền hủy đơn hàng này.' });
    }

    if (order.orderStatus !== 'pending_payment') {
      return res.status(400).json({ 
        success: false, 
        message: 'Chỉ có thể hủy các đơn hàng đang chờ thanh toán.' 
      });
    }

    order.orderStatus = 'cancelled';
    order.paymentStatus = 'unpaid';
    await order.save();

    // Release accounts
    const accountIds = order.items.map(item => item.accountId);
    await GameAccount.updateMany(
      { _id: { $in: accountIds } },
      { status: 'available', $unset: { reservedUntil: '' } }
    );

    // Rollback coupon usage
    if (order.coupon && order.coupon.code) {
      await Coupon.updateOne({ code: order.coupon.code }, { $inc: { usedCount: -1 } });
    }

    await createAuditLog(req.user._id, 'CANCEL_ORDER', `Khách hàng hủy đơn hàng: ${order.orderCode}`, req.ip);

    res.status(200).json({
      success: true,
      message: 'Đã hủy đơn hàng thành công.',
      order
    });
  } catch (error) {
    next(error);
  }
};

const trackOrder = async (req, res, next) => {
  try {
    const { orderCode, phone } = req.body;
    if (!orderCode || !phone) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã đơn và số điện thoại.' });
    }

    const order = await Order.findOne({ 
      orderCode: orderCode.toUpperCase().trim(), 
      'customerInfo.phone': phone.trim() 
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đơn hàng khớp với yêu cầu.' });
    }

    // Project credentials out if not completed
    const orderObj = order.toObject();
    const showCredentials = order.orderStatus === 'completed';

    for (let i = 0; i < orderObj.items.length; i++) {
      const item = orderObj.items[i];
      if (showCredentials) {
        const fullAccount = await GameAccount.findById(item.accountId);
        if (fullAccount) {
          item.loginInfo = fullAccount.loginInfo;
        }
      } else {
        delete item.loginInfo;
      }
    }

    res.status(200).json({
      success: true,
      order: orderObj
    });
  } catch (error) {
    next(error);
  }
};

const uploadPaymentProof = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền tải minh chứng cho đơn này.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng tải lên ảnh minh chứng thanh toán.' });
    }

    if (order.paymentProof) {
      deleteFile(order.paymentProof);
    }

    order.paymentProof = `/uploads/payment-proofs/${req.file.filename}`;
    order.orderStatus = 'pending_confirm';
    order.paymentStatus = 'waiting_confirm';
    await order.save();

    await createAuditLog(
      req.user._id, 
      'UPLOAD_PAYMENT_PROOF', 
      `Tải ảnh minh chứng chuyển khoản cho đơn: ${order.orderCode}`, 
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Tải minh chứng thanh toán thành công. Chờ nhân viên phê duyệt.',
      order
    });
  } catch (error) {
    next(error);
  }
};

const confirmPayment = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    order.paymentStatus = 'paid';
    order.orderStatus = 'delivering'; // transition to delivering after payment confirm
    order.handledBy = req.user._id;
    await order.save();

    const accountIds = order.items.map(item => item.accountId);
    await GameAccount.updateMany(
      { _id: { $in: accountIds } },
      { status: 'sold', soldAt: new Date(), $unset: { reservedUntil: '' } }
    );

    await createAuditLog(
      req.user._id,
      'CONFIRM_PAYMENT',
      `Xác nhận thanh toán thành công cho đơn: ${order.orderCode}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Đã xác nhận thanh toán thành công. Đơn hàng chuyển sang trạng thái Bàn giao.',
      order
    });
  } catch (error) {
    next(error);
  }
};

const deliverOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    order.orderStatus = 'completed';
    order.completedAt = new Date();
    order.deliveredAt = new Date();
    order.handledBy = req.user._id;
    await order.save();

    await createAuditLog(
      req.user._id,
      'DELIVER_ORDER',
      `Bàn giao tài khoản game thành công cho đơn: ${order.orderCode}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Bàn giao tài khoản thành công. Đơn hàng hoàn thành.',
      order
    });
  } catch (error) {
    next(error);
  }
};

const createManualOrder = async (req, res, next) => {
  const soldAccountIds = [];
  try {
    const { customerInfo, accountIds, paymentMethod, staffNote } = req.body;
    const staffId = req.user._id;

    if (!customerInfo || !customerInfo.fullName || !customerInfo.phone) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin khách hàng (họ tên, số điện thoại).' });
    }
    if (!accountIds || accountIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách tài khoản game trống.' });
    }

    const orderItems = [];
    let subtotal = 0;

    for (const accountId of accountIds) {
      const updatedAccount = await GameAccount.findOneAndUpdate(
        { _id: accountId, status: 'available' },
        { status: 'sold', soldAt: new Date() },
        { new: true }
      );

      if (!updatedAccount) {
        if (soldAccountIds.length > 0) {
          await GameAccount.updateMany(
            { _id: { $in: soldAccountIds } },
            { $set: { status: 'available' }, $unset: { soldAt: '' } }
          );
        }
        return res.status(400).json({
          success: false,
          message: `Tài khoản game ID ${accountId} không còn khả dụng (có thể đã bán hoặc giữ chỗ).`
        });
      }

      soldAccountIds.push(updatedAccount._id);

      orderItems.push({
        accountId: updatedAccount._id,
        code: updatedAccount.code,
        name: updatedAccount.name,
        gameType: updatedAccount.gameType,
        image: updatedAccount.images[0] || '',
        price: updatedAccount.price,
        subtotal: updatedAccount.price
      });

      subtotal += updatedAccount.price;
    }

    const orderCode = generateOrderCode();
    const isCash = paymentMethod === 'cash';

    const orderData = {
      orderCode,
      user: staffId,
      customerInfo: {
        fullName: customerInfo.fullName,
        phone: customerInfo.phone,
        email: customerInfo.email || '',
        note: customerInfo.note || ''
      },
      items: orderItems,
      subtotal,
      discountAmount: 0,
      total: subtotal,
      paymentMethod: isCash ? 'cash' : 'bank_transfer',
      paymentStatus: isCash ? 'paid' : 'unpaid',
      orderStatus: isCash ? 'completed' : 'pending_payment',
      staffNote: staffNote || '',
      handledBy: staffId,
      completedAt: isCash ? new Date() : undefined,
      deliveredAt: isCash ? new Date() : undefined
    };

    const order = await Order.create(orderData);

    await createAuditLog(
      staffId,
      'CREATE_MANUAL_ORDER',
      `Tạo đơn thủ công. Mã đơn: ${orderCode}. Số tiền: ${subtotal.toLocaleString('vi-VN')}đ. Phương thức: ${paymentMethod}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Tạo đơn hàng thủ công thành công.',
      order
    });
  } catch (error) {
    if (soldAccountIds.length > 0) {
      await GameAccount.updateMany(
        { _id: { $in: soldAccountIds } },
        { $set: { status: 'available' }, $unset: { soldAt: '' } }
      );
    }
    next(error);
  }
};

const directHandover = async (req, res, next) => {
  try {
    const { accountId, customerInfo } = req.body;
    const staffId = req.user._id;

    if (!accountId) {
      return res.status(400).json({ success: false, message: 'Thiếu accountId.' });
    }
    if (!customerInfo || !customerInfo.fullName || !customerInfo.phone) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin khách hàng (họ tên, số điện thoại).' });
    }

    const updatedAccount = await GameAccount.findOneAndUpdate(
      { _id: accountId, status: 'available' },
      { status: 'sold', soldAt: new Date() },
      { new: true }
    );

    if (!updatedAccount) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản game không khả dụng (có thể đã bán hoặc giữ chỗ).'
      });
    }

    const orderCode = generateOrderCode();
    const price = updatedAccount.price;
    const paymentMethod = customerInfo.paymentMethod || 'cash';

    const orderData = {
      orderCode,
      user: staffId,
      customerInfo: {
        fullName: customerInfo.fullName,
        phone: customerInfo.phone,
        email: customerInfo.email || '',
        note: customerInfo.note || ''
      },
      items: [{
        accountId: updatedAccount._id,
        code: updatedAccount.code,
        name: updatedAccount.name,
        gameType: updatedAccount.gameType,
        image: updatedAccount.images[0] || '',
        price: price,
        subtotal: price
      }],
      subtotal: price,
      discountAmount: 0,
      total: price,
      paymentMethod: paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'cash',
      paymentStatus: 'paid',
      orderStatus: 'completed',
      staffNote: 'Bàn giao trực tiếp cho khách vãng lai',
      handledBy: staffId,
      completedAt: new Date(),
      deliveredAt: new Date()
    };

    await Order.create(orderData);

    await createAuditLog(
      staffId,
      'DIRECT_HANDOVER',
      `Bàn giao nick trực tiếp: ${updatedAccount.code}. Khách: ${customerInfo.fullName}. Đơn: ${orderCode}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      orderCode,
      loginInfo: updatedAccount.loginInfo
    });
  } catch (error) {
    next(error);
  }
};

const cancelPayment = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    order.paymentStatus = 'unpaid';
    order.orderStatus = 'cancelled';
    order.staffNote = reason || 'Từ chối thanh toán';
    order.handledBy = req.user._id;
    await order.save();

    const accountIds = order.items.map(item => item.accountId);
    await GameAccount.updateMany(
      { _id: { $in: accountIds } },
      { status: 'available', $unset: { reservedUntil: '', soldAt: '' } }
    );

    await createAuditLog(
      req.user._id,
      'CANCEL_PAYMENT',
      `Từ chối thanh toán và hủy đơn: ${order.orderCode}. Lý do: ${reason}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Đã từ chối thanh toán và hủy đơn hàng.',
      order
    });
  } catch (error) {
    next(error);
  }
};

const requestReupload = async (req, res, next) => {
  try {
    const { note } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    order.orderStatus = 'pending_payment';
    order.staffNote = note || 'Yêu cầu tải lại minh chứng thanh toán.';
    order.handledBy = req.user._id;
    await order.save();

    await createAuditLog(
      req.user._id,
      'REQUEST_REUPLOAD',
      `Yêu cầu tải lại minh chứng cho đơn: ${order.orderCode}. Ghi chú: ${note}`,
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Đã yêu cầu khách hàng tải lại minh chứng thanh toán.',
      order
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  trackOrder,
  uploadPaymentProof,
  confirmPayment,
  deliverOrder,
  createManualOrder,
  directHandover,
  cancelPayment,
  requestReupload
};
