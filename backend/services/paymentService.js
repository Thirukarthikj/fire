const Razorpay = require('razorpay');
const crypto = require('crypto');

let razorpayInstance = null;

function getRazorpayInstance() {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }
  return razorpayInstance;
}

const createRazorpayOrder = async (amountInINR, receiptId, notes = {}) => {
  try {
    const razorpay = getRazorpayInstance();
    // Razorpay amount is in paise (1 INR = 100 paise)
    const options = {
      amount: Math.round(amountInINR * 100),
      currency: 'INR',
      receipt: receiptId,
      notes
    };
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('[Razorpay Order Creation Error]:', error);
    throw new Error(error.error ? error.error.description : error.message);
  }
};

const verifyPaymentSignature = (orderId, paymentId, signature) => {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('[Razorpay Signature Verification Error]:', error);
    return false;
  }
};

const initiateRefund = async (paymentId, amountInINR, notes = {}) => {
  try {
    const razorpay = getRazorpayInstance();
    const options = {
      notes
    };
    if (amountInINR) {
      options.amount = Math.round(amountInINR * 100);
    }
    const refund = await razorpay.payments.refund(paymentId, options);
    return refund;
  } catch (error) {
    console.error('[Razorpay Refund Error]:', error);
    throw new Error(error.error ? error.error.description : error.message);
  }
};

const verifyWebhookSignature = (rawBody, signature) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'placeholder_webhook_secret';
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('[Razorpay Webhook Verification Error]:', error);
    return false;
  }
};

const fetchPayment = async (paymentId) => {
  try {
    const razorpay = getRazorpayInstance();
    return await razorpay.payments.fetch(paymentId);
  } catch (error) {
    console.error('[Razorpay Fetch Payment Error]:', error);
    throw new Error(error.error ? error.error.description : error.message);
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  initiateRefund,
  verifyWebhookSignature,
  fetchPayment
};

