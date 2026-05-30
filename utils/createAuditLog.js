const AuditLog = require('../models/AuditLog');

const createAuditLog = async (userId, action, details, ipAddress = '') => {
  try {
    await AuditLog.create({
      user: userId,
      action,
      details,
      ipAddress
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

module.exports = createAuditLog;
