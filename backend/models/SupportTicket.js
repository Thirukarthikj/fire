const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const supportTicketSchema = new Schema({
  ticketNumber: {
    type: String,
    unique: true,
    default: () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return `TKT-${result}`;
    }
  },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  guestName: { type: String, trim: true },
  guestEmail: { type: String, trim: true, lowercase: true },
  guestPhone: { type: String, trim: true },
  subject: { type: String, required: true, trim: true },
  messages: [{
    sender: { type: String, enum: ['customer', 'admin'], required: true },
    senderName: String,
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  category: { type: String, enum: ['order', 'product', 'payment', 'delivery', 'refund', 'other'] },
  order: { type: Schema.Types.ObjectId, ref: 'Order' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
supportTicketSchema.index({ user: 1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ ticketNumber: 1 });

// Pre-save: generate ticketNumber if new
supportTicketSchema.pre('save', function (next) {
  if (!this.isNew) return next();

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  this.ticketNumber = `TKT-${result}`;
  next();
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
