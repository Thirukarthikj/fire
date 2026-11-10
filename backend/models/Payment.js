const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  razorpayOrderId: { type: String, required: false },
  razorpayPaymentId: String,
  razorpaySignature: String,
  upiTransactionId: { type: String, trim: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'],
    default: 'created'
  },
  method: String,
  refunds: [{
    refundId: String,
    amount: Number,
    reason: String,
    status: { type: String, enum: ['pending', 'processed', 'failed'] },
    createdAt: { type: Date, default: Date.now }
  }],
  totalRefunded: { type: Number, default: 0 },
  webhookEvents: [{
    event: String,
    payload: Object,
    receivedAt: { type: Date, default: Date.now },
    processed: { type: Boolean, default: false }
  }],
  errorMessage: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ order: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
