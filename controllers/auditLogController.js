const AuditLog = require('../models/AuditLog');

const getLogs = async (req, res, next) => {
  try {
    const { action, search, limit = 50, page = 1 } = req.query;
    const query = {};

    if (action) {
      query.action = action;
    }

    if (search) {
      query.$or = [
        { details: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const logs = await AuditLog.find(query)
      .populate('user', 'fullName username role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLogs
};
