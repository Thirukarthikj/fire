const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorySchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  slug: { type: String, unique: true, lowercase: true },
  description: String,
  image: String,
  parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  productCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save: generate slug from name
categorySchema.pre('save', async function (next) {
  if (!this.isModified('name')) return next();
  try {
    let slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existing = await mongoose.model('Category').findOne({
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

// Virtual: subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

module.exports = mongoose.model('Category', categorySchema);
