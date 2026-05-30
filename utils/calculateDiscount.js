const calculateDiscount = (coupon, orderValue) => {
  if (!coupon || !coupon.isActive) {
    return { valid: false, message: 'Mã giảm giá không hoạt động hoặc không tồn tại.' };
  }

  const now = new Date();
  if (now < new Date(coupon.startDate) || now > new Date(coupon.endDate)) {
    return { valid: false, message: 'Mã giảm giá đã hết hạn hoặc chưa đến thời gian áp dụng.' };
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, message: 'Mã giảm giá đã đạt giới hạn lượt sử dụng.' };
  }

  if (orderValue < coupon.minOrderValue) {
    return { 
      valid: false, 
      message: `Đơn hàng tối thiểu phải từ ${coupon.minOrderValue.toLocaleString('vi-VN')}đ để sử dụng mã này.` 
    };
  }

  let discountAmount = 0;
  if (coupon.discountType === 'percent') {
    discountAmount = Math.floor((orderValue * coupon.discountValue) / 100);
    if (coupon.maxDiscount > 0 && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }
  } else if (coupon.discountType === 'fixed') {
    discountAmount = coupon.discountValue;
  }

  // Discount cannot exceed order value
  if (discountAmount > orderValue) {
    discountAmount = orderValue;
  }

  return { valid: true, discountAmount };
};

module.exports = calculateDiscount;
