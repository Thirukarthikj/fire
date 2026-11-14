const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const addressSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: String,
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  country: { type: String, default: 'India' },
  isDefault: { type: Boolean, default: false },
  label: { type: String, enum: ['home', 'work', 'other'], default: 'home' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index
addressSchema.index({ user: 1 });

// Pre-save: if isDefault is being set to true, unset all other defaults for this user
addressSchema.pre('save', async function () {
  if (this.isModified('isDefault') && this.isDefault === true) {
    try {
      await mongoose.model('Address').updateMany(
        { user: this.user, _id: { $ne: this._id } },
        { $set: { isDefault: false } }
      );
    } catch (err) {
      console.warn('Address pre-save updateMany notice:', err.message);
    }
  }
});

module.exports = mongoose.model('Address', addressSchema);
