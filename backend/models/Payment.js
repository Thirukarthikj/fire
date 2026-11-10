const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  transactionId: { type: String, trim: true },
  upiTransactionId: { type: String, trim: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'],
    default: 'created'
  },
  method: { type: String, default: 'Google Pay / UPI QR' },
  refunds: [{
    refundId: String,
    amount: Number,
    reason: String,
    status: { type: String, enum: ['pending', 'processed', 'failed'] },
    createdAt: { type: Date, default: Date.now }
  }],
  totalRefunded: { type: Number, default: 0 },
  errorMessage: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ upiTransactionId: 1 });
paymentSchema.index({ order: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
