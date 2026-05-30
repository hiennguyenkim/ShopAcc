const Coupon = require('../models/Coupon');
const calculateDiscount = require('../utils/calculateDiscount');
const createAuditLog = require('../utils/createAuditLog');

const getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: coupons.length,
      coupons
    });
  } catch (error) {
    next(error);
  }
};

const createCoupon = async (req, res, next) => {
  try {
    const { 
      code, 
      name, 
      discountType, 
      discountValue, 
      minOrderValue, 
      maxDiscount, 
      usageLimit, 
      perUserLimit, 
      applyGameType, 
      startDate, 
      endDate, 
      isActive 
    } = req.body;

    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Mã giảm giá này đã tồn tại.' });
    }

    const newCoupon = await Coupon.create({
      code,
      name,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      usageLimit,
      perUserLimit,
      applyGameType,
      startDate,
      endDate,
      isActive
    });

    await createAuditLog(req.user._id, 'CREATE_COUPON', `Tạo mã giảm giá: ${code}`, req.ip);

    res.status(201).json({
      success: true,
      message: 'Tạo mã giảm giá thành công.',
      coupon: newCoupon
    });
  } catch (error) {
    next(error);
  }
};

const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mã giảm giá.' });
    }

    const { 
      code, 
      name, 
      discountType, 
      discountValue, 
      minOrderValue, 
      maxDiscount, 
      usageLimit, 
      perUserLimit, 
      applyGameType, 
      startDate, 
      endDate, 
      isActive 
    } = req.body;

    if (code && code.toUpperCase() !== coupon.code) {
      const existing = await Coupon.findOne({ code: code.toUpperCase(), _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Mã giảm giá đã bị trùng.' });
      }
      coupon.code = code.toUpperCase();
    }

    if (name) coupon.name = name;
    if (discountType) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = discountValue;
    if (minOrderValue !== undefined) coupon.minOrderValue = minOrderValue;
    if (maxDiscount !== undefined) coupon.maxDiscount = maxDiscount;
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
    if (perUserLimit !== undefined) coupon.perUserLimit = perUserLimit;
    if (applyGameType !== undefined) coupon.applyGameType = applyGameType;
    if (startDate) coupon.startDate = startDate;
    if (endDate) coupon.endDate = endDate;
    if (isActive !== undefined) coupon.isActive = isActive;

    await coupon.save();

    await createAuditLog(req.user._id, 'UPDATE_COUPON', `Cập nhật mã giảm giá: ${coupon.code}`, req.ip);

    res.status(200).json({
      success: true,
      message: 'Cập nhật mã giảm giá thành công.',
      coupon
    });
  } catch (error) {
    next(error);
  }
};

const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mã giảm giá.' });
    }

    await Coupon.deleteOne({ _id: req.params.id });

    await createAuditLog(req.user._id, 'DELETE_COUPON', `Xóa mã giảm giá: ${coupon.code}`, req.ip);

    res.status(200).json({
      success: true,
      message: 'Xóa mã giảm giá thành công.'
    });
  } catch (error) {
    next(error);
  }
};

const applyCoupon = async (req, res, next) => {
  try {
    const { code, orderValue } = req.body;
    if (!code || !orderValue) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin mã hoặc giá trị đơn hàng.' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Mã giảm giá không tồn tại.' });
    }

    const result = calculateDiscount(coupon, orderValue);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.status(200).json({
      success: true,
      discountAmount: result.discountAmount,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon
};
