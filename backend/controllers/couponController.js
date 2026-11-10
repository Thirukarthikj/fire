const Coupon = require('../models/Coupon');

// POST /api/coupons/validate
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, cartTotal = 0 } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon code not found' });
    }

    if (!coupon.isValid()) {
      return res.status(400).json({ success: false, message: 'Coupon has expired or usage limit exceeded' });
    }

    const total = Number(cartTotal) || 0;
    if (coupon.minOrderAmount && total < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Order must be at least ₹${coupon.minOrderAmount} to apply this coupon`
      });
    }

    const discount = coupon.calculateDiscount(total);

    res.status(200).json({
      success: true,
      message: 'Coupon is valid',
      data: {
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        discount
      }
    });
  } catch (error) {
    next(error);
  }
};

