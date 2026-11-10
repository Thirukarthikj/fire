const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const auditLogSchema = new Schema({
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  performerName: String,
  performerRole: String,
  details: Object,
  previousValues: Object,
  newValues: Object,
  ipAddress: String
}, {
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
