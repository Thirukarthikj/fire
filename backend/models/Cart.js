const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { name: String, option: String },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    price: { type: Number, required: true }
  }],
  coupon: { type: Schema.Types.ObjectId, ref: 'Coupon' },
  couponCode: String,
  couponDiscount: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Method: getSubtotal
cartSchema.methods.getSubtotal = function () {
  return this.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
};

// Method: getTotal
cartSchema.methods.getTotal = function () {
  const subtotal = this.getSubtotal();
  return subtotal - (this.couponDiscount || 0);
};

module.exports = mongoose.model('Cart', cartSchema);
