const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  orderNumber: {
    type: String,
    unique: true,
    default: () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const random = Math.random().toString(36).substring(2, 7).toUpperCase();
      return `ORD-${year}${month}${day}-${random}`;
    }
  },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    sku: String,
    variant: { name: String, option: String },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    image: String
  }],
  shippingAddress: {
    name: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  couponCode: String,
  tax: { type: Number, default: 0 },
  shippingCharge: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  paymentMethod: { type: String, default: 'razorpay' },
  upiTransactionId: { type: String, trim: true },
  notes: String,
  cancellationReason: String,
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// Pre-save: ensure orderNumber and initial status
orderSchema.pre('save', function (next) {
  if (!this.isNew) return next();

  if (!this.orderNumber) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.orderNumber = `ORD-${year}${month}${day}-${random}`;
  }

  // Add initial status to statusHistory if empty
  if (!this.statusHistory || this.statusHistory.length === 0) {
    this.statusHistory = [{
      status: this.status || 'pending',
      timestamp: new Date(),
      note: 'Order created'
    }];
  }

  next();
});

module.exports = mongoose.model('Order', orderSchema);
