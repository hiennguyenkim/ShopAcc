const Order = require('../models/Order');
const User = require('../models/User');

// GET /api/stats/overview
const getOverview = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const matchStage = { orderStatus: 'completed' };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const orderStats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          totalSoldNicks: { $sum: { $size: '$items' } }
        }
      }
    ]);

    const stats = orderStats[0] || { totalRevenue: 0, totalOrders: 0, totalSoldNicks: 0 };
    const avgOrderValue = stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders) : 0;

    // Aggregate new users count
    const userMatch = {};
    if (startDate || endDate) {
      userMatch.createdAt = {};
      if (startDate) userMatch.createdAt.$gte = new Date(startDate);
      if (endDate) userMatch.createdAt.$lte = new Date(endDate);
    }
    const newUsers = await User.countDocuments(userMatch);

    res.status(200).json({
      success: true,
      totalRevenue: stats.totalRevenue,
      totalOrders: stats.totalOrders,
      totalSoldNicks: stats.totalSoldNicks,
      avgOrderValue,
      newUsers
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/stats/revenue-chart
const getRevenueChart = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const matchStage = { orderStatus: 'completed' };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const dailyStats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          revenue: 1,
          orderCount: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      chartData: dailyStats
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/stats/by-category
const getByCategory = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const matchStage = { orderStatus: 'completed' };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const categoryStats = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.gameType',
          nickCount: { $sum: 1 },
          revenue: { $sum: '$items.price' }
        }
      },
      {
        $project: {
          _id: 0,
          gameType: '$_id',
          nickCount: 1,
          revenue: 1
        }
      }
    ]);

    const gameLabels = {
      'lien-quan': 'Liên Quân',
      'free-fire': 'Free Fire',
      'fifa': 'FIFA',
      'lol': 'LMHT',
      'pubg': 'PUBG'
    };

    const formattedStats = categoryStats.map(item => ({
      gameType: item.gameType,
      label: gameLabels[item.gameType] || item.gameType,
      nickCount: item.nickCount,
      revenue: item.revenue
    }));

    res.status(200).json({
      success: true,
      stats: formattedStats
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/stats/top-depositors
const getTopDepositors = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const depositors = await User.find({ role: 'user', totalDeposited: { $gt: 0 } })
      .sort({ totalDeposited: -1 })
      .limit(limit);

    const result = depositors.map((d, index) => {
      let maskedName = 'Khách Hàng';
      if (d.fullName) {
        const parts = d.fullName.trim().split(/\s+/);
        const first = parts[0];
        const maskedFirst = first.substring(0, 3) + '***';
        const rest = parts.slice(1).join(' ');
        maskedName = rest ? `${maskedFirst} ${rest}` : maskedFirst;
      }
      return {
        rank: index + 1,
        name: maskedName,
        avatar: d.fullName ? d.fullName.charAt(0).toUpperCase() : 'U',
        totalDeposited: d.totalDeposited,
        lastDepositAt: d.lastDepositAt || d.updatedAt
      };
    });

    res.status(200).json({
      success: true,
      depositors: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getRevenueChart,
  getByCategory,
  getTopDepositors
};
