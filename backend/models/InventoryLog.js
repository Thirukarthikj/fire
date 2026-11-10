const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const inventoryLogSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  type: {
    type: String,
    enum: ['addition', 'reduction', 'adjustment', 'sale', 'return', 'damage'],
    required: true
  },
  quantity: { type: Number, required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reason: String,
  performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  order: { type: Schema.Types.ObjectId, ref: 'Order' }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index
inventoryLogSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
