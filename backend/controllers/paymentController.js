const Payment = require('../models/Payment');
const Order = require('../models/Order');

// GET /api/payments/:orderId
exports.getPaymentByOrderId = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const payment = await Payment.findOne({ order: orderId, user: req.user._id });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/notify
exports.handleWebhook = async (req, res, next) => {
  try {
    const { orderId, upiTransactionId, status = 'paid' } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (status === 'paid') {
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      if (upiTransactionId) order.upiTransactionId = upiTransactionId;
      order.statusHistory.push({
        status: 'confirmed',
        note: `Payment confirmed via UPI notification (${upiTransactionId || 'Verified'})`
      });
      await order.save();

      await Payment.findOneAndUpdate(
        { order: order._id },
        { status: 'captured', upiTransactionId, method: 'Google Pay / UPI QR' }
      );
    }

    res.status(200).json({ success: true, message: 'Payment status updated' });
  } catch (error) {
    next(error);
  }
};
