const { VALID_STATUS_TRANSITIONS } = require('../utils/constants');
const { generateOrderNumber } = require('../utils/helpers');

const calculateOrderTotals = (items, coupon = null, deliveryFee = 0) => {
  let subtotal = 0;

  for (const item of items) {
    subtotal += item.price * item.quantity;
  }

  let discount = 0;
  if (coupon && typeof coupon.calculateDiscount === 'function') {
    discount = coupon.calculateDiscount(subtotal);
  } else if (coupon && coupon.value) {
    if (coupon.type === 'percentage') {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = Math.min(coupon.value, subtotal);
    }
  }

  const tax = 0; // Configurable tax if needed
  const shippingCharge = subtotal > 1500 ? 0 : (deliveryFee || 100);
  const total = Math.max(0, subtotal - discount + tax + shippingCharge);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    tax,
    shippingCharge,
    total: Math.round(total * 100) / 100
  };
};

const validateStatusTransition = (currentStatus, newStatus) => {
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
};

const getValidStatusTransitions = (currentStatus) => {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
};

module.exports = {
  generateOrderNumber,
  calculateOrderTotals,
  validateStatusTransition,
  getValidStatusTransitions
};

