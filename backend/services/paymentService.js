const crypto = require('crypto');

/**
 * Generate a unique payment/session transaction reference
 */
const generateTransactionReference = (prefix = 'UPI') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Initiate a store refund / UPI reversal record
 */
const initiateRefund = async (paymentId, amountInINR, notes = {}) => {
  return {
    refundId: `RFD-${Date.now()}`,
    amount: amountInINR,
    status: 'processed',
    notes,
    createdAt: new Date()
  };
};

module.exports = {
  generateTransactionReference,
  initiateRefund
};
