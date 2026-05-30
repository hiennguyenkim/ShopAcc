const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  targetEntity: { type: String }, // e.g. 'GameAccount', 'Order', etc.
  entityId: { type: mongoose.Schema.Types.ObjectId }, // Reference ID of the target entity
  details: { type: String, required: true },
  ipAddress: { type: String }
}, {
  timestamps: { createdAt: true, updatedAt: false } // only need createdAt for audit logs
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
