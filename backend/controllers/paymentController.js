const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { verifyWebhookSignature } = require('../services/paymentService');
const { releaseStock } = require('../services/inventoryService');

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

// POST /api/payments/webhook
exports.handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body;

    // Verify webhook signature if secret configured
    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (!payload || !payload.payment || !payload.payment.entity) {
      return res.status(200).json({ status: 'ok', message: 'Ignored non-payment event' });
    }

    const entity = payload.payment.entity;
    const rzpOrderId = entity.order_id;
    const rzpPaymentId = entity.id;

    const payment = await Payment.findOne({ razorpayOrderId: rzpOrderId });
    if (!payment) {
      return res.status(200).json({ status: 'ok', message: 'Order not matched' });
    }

    // Check idempotency - has this event already been processed?
    const alreadyProcessed = payment.webhookEvents.some(
      we => we.event === event && we.processed
    );
    if (alreadyProcessed) {
      return res.status(200).json({ status: 'ok', message: 'Event already processed' });
    }

    // Process event
    if (event === 'payment.captured') {
      payment.status = 'captured';
      payment.razorpayPaymentId = rzpPaymentId;
      payment.method = entity.method;

      const order = await Order.findById(payment.order);
      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        order.statusHistory.push({
          status: 'confirmed',
          note: `Webhook verified payment: ${rzpPaymentId}`
        });
        await order.save();
      }
    } else if (event === 'payment.failed') {
      payment.status = 'failed';
      payment.errorMessage = entity.error_description || 'Payment failed via webhook';

      const order = await Order.findById(payment.order);
      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        order.statusHistory.push({
          status: 'cancelled',
          note: `Payment failed webhook notification`
        });
        await order.save();

        for (const item of order.items) {
          if (item.product) {
            await releaseStock(item.product, item.quantity, order._id, order.user);
          }
        }
      }
    }

    // Log the webhook event
    payment.webhookEvents.push({
      event,
      payload: req.body,
      processed: true
    });
    await payment.save();

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[Webhook Error]:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

