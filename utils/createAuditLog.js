const AuditLog = require('../models/AuditLog');

const createAuditLog = async (userId, action, details, ipAddress = '', targetEntity = null, entityId = null) => {
  try {
    await AuditLog.create({
      user: userId,
      action,
      targetEntity,
      entityId,
      details,
      ipAddress
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

module.exports = createAuditLog;
