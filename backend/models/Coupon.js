const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const couponSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: String,
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount: Number,
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  usageLimit: { type: Number, default: null },
  usedCount: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  applicableCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  applicableProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// Method: isValid
couponSchema.methods.isValid = function () {
  const now = new Date();

  if (!this.isActive) return false;
  if (now < this.startDate) return false;
  if (now > this.endDate) return false;
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) return false;

  return true;
};

// Method: calculateDiscount
couponSchema.methods.calculateDiscount = function (orderAmount) {
  if (orderAmount < this.minOrderAmount) return 0;

  let discount = 0;

  if (this.type === 'percentage') {
    discount = (orderAmount * this.value) / 100;
    // Cap at maxDiscount if set
    if (this.maxDiscount && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
  } else if (this.type === 'fixed') {
    discount = this.value;
  }

  // Discount should not exceed order amount
  if (discount > orderAmount) {
    discount = orderAmount;
  }

  return discount;
};

module.exports = mongoose.model('Coupon', couponSchema);
