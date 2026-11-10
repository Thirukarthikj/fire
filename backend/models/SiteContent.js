const mongoose = require('mongoose');

const siteContentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['banner', 'featured-category', 'featured-product', 'faq', 'policy', 'contact', 'safety', 'announcement', 'setting'],
    required: true
  },
  title: String,
  subtitle: String,
  content: String,
  image: String,
  link: String,
  buttonText: String,
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index
siteContentSchema.index({ type: 1, isActive: 1, displayOrder: 1 });

module.exports = mongoose.model('SiteContent', siteContentSchema);
