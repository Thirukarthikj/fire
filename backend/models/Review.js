const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, required: true, trim: true },
  userLocation: { type: String, default: 'Tamil Nadu, India' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true, trim: true },
  comment: { type: String, required: true, trim: true },
  verifiedPurchase: { type: Boolean, default: true },
  status: { type: String, enum: ['approved', 'pending', 'rejected'], default: 'approved' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
