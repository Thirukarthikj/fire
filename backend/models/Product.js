const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, unique: true, lowercase: true },
  sku: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String, required: true },
  shortDescription: { type: String, maxlength: 300 },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: String, trim: true, default: 'Standard Fireworks' },
  images: [{
    url: String,
    alt: String,
    isPrimary: { type: Boolean, default: false },
    public_id: String
  }],
  price: { type: Number, required: true, min: 0 },
  comparePrice: { type: Number, min: 0 },
  discount: { type: Number, default: 0, min: 0, max: 100 },
  variants: [{
    name: String,
    options: [{
      label: String,
      priceModifier: { type: Number, default: 0 },
      stock: { type: Number, default: 0 }
    }]
  }],
  specifications: [{ key: String, value: String }],
  safetyInfo: String,
  stock: { type: Number, required: true, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  sold: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  isNewArrival: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  tags: [String],
  weight: Number,
  dimensions: { length: Number, width: Number, height: Number }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Pre-save: generate slug from name
productSchema.pre('save', async function (next) {
  if (!this.isModified('name')) return next();
  try {
    let slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug already exists (excluding this document)
    const existing = await mongoose.model('Product').findOne({
      slug: slug,
      _id: { $ne: this._id }
    });

    if (existing) {
      const randomChars = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${randomChars}`;
    }

    this.slug = slug;
    next();
  } catch (err) {
    next(err);
  }
});

// Virtual: effectivePrice
productSchema.virtual('effectivePrice').get(function () {
  return this.price - (this.price * this.discount / 100);
});

// Virtual: isLowStock
productSchema.virtual('isLowStock').get(function () {
  return this.stock <= this.lowStockThreshold;
});

// Virtual: isOutOfStock
productSchema.virtual('isOutOfStock').get(function () {
  return this.stock <= 0;
});

module.exports = mongoose.model('Product', productSchema);
