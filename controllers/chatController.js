const Message = require('../models/Message');
const User = require('../models/User');

// POST /api/chat/send
const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user._id;

    if (!receiverId || !content) {
      return res.status(400).json({ success: false, message: 'Thiếu receiverId hoặc nội dung tin nhắn.' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Người nhận không tồn tại.' });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      content
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId receiverId', 'fullName username role');

    res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/chat/conversations [staff/admin]
const getConversations = async (req, res, next) => {
  try {
    const messages = await Message.find({
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }]
    })
    .sort({ createdAt: 1 })
    .populate('senderId receiverId', 'fullName username role');

    const conversationMap = {};
    messages.forEach(msg => {
      if (!msg.senderId || !msg.receiverId) return;

      const isSender = msg.senderId._id.toString() === req.user._id.toString();
      const partner = isSender ? msg.receiverId : msg.senderId;
      const partnerId = partner._id.toString();

      if (!conversationMap[partnerId]) {
        conversationMap[partnerId] = {
          userId: partner._id,
          userName: partner.fullName || partner.username,
          lastMessage: msg.content,
          lastTime: msg.createdAt,
          unreadCount: 0
        };
      } else {
        conversationMap[partnerId].lastMessage = msg.content;
        conversationMap[partnerId].lastTime = msg.createdAt;
      }

      if (msg.receiverId._id.toString() === req.user._id.toString() && !msg.isRead) {
        conversationMap[partnerId].unreadCount += 1;
      }
    });

    const conversations = Object.values(conversationMap).sort((a, b) => b.lastTime - a.lastTime);

    res.status(200).json({
      success: true,
      conversations
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/chat/messages [requireAuth]
const getMessages = async (req, res, next) => {
  try {
    const { with: withUserId, page = 1, limit = 50 } = req.query;
    const currentUserId = req.user._id;

    if (!withUserId) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số "with" (userId).' });
    }

    const query = {
      $or: [
        { senderId: currentUserId, receiverId: withUserId },
        { senderId: withUserId, receiverId: currentUserId }
      ]
    };

    const skip = (Number(page) - 1) * Number(limit);
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('senderId receiverId', 'fullName username role');

    // Return oldest to newest for UI bubble chat flow
    messages.reverse();

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/chat/read [requireAuth]
const markAsRead = async (req, res, next) => {
  try {
    const { senderId } = req.body;
    const receiverId = req.user._id;

    if (!senderId) {
      return res.status(400).json({ success: false, message: 'Thiếu senderId.' });
    }

    await Message.updateMany(
      { senderId, receiverId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu đã đọc các tin nhắn.'
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/chat/staff-list (public)
const getStaffList = async (req, res, next) => {
  try {
    const staffMembers = await User.find({
      role: { $in: ['staff', 'admin'] },
      isActive: true
    }).select('fullName username role');

    const formattedStaff = staffMembers.map(u => ({
      id: u._id,
      _id: u._id,
      name: u.fullName || u.username,
      role: u.role
    }));

    res.status(200).json({
      success: true,
      staffList: formattedStaff
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/chat/unread-count [requireAuth]
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.countDocuments({
      receiverId: req.user._id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/chat/all-conversations [admin]
const getAllConversations = async (req, res, next) => {
  try {
    const messages = await Message.find({})
      .sort({ createdAt: 1 })
      .populate('senderId receiverId', 'fullName username role');

    const pairMap = {};
    messages.forEach(msg => {
      if (!msg.senderId || !msg.receiverId) return;

      let customer = null;
      let staff = null;

      if (msg.senderId.role === 'user') {
        customer = msg.senderId;
      } else {
        staff = msg.senderId;
      }

      if (msg.receiverId.role === 'user') {
        customer = msg.receiverId;
      } else {
        staff = msg.receiverId;
      }

      if (!customer) {
        customer = msg.senderId;
      }
      if (!staff) {
        staff = msg.receiverId;
      }

      const pairKey = `${customer._id}_${staff._id}`;
      if (!pairMap[pairKey]) {
        pairMap[pairKey] = {
          userId: customer._id,
          userName: customer.fullName || customer.username,
          staffId: staff._id,
          staffName: staff.fullName || staff.username,
          lastMessage: msg.content,
          lastTime: msg.createdAt,
          unreadCount: 0
        };
      } else {
        pairMap[pairKey].lastMessage = msg.content;
        pairMap[pairKey].lastTime = msg.createdAt;
      }

      if (msg.senderId._id.toString() === customer._id.toString() && !msg.isRead) {
        pairMap[pairKey].unreadCount += 1;
      }
    });

    const conversations = Object.values(pairMap).sort((a, b) => b.lastTime - a.lastTime);

    res.status(200).json({
      success: true,
      conversations
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMessage,
  getConversations,
  getMessages,
  markAsRead,
  getStaffList,
  getUnreadCount,
  getAllConversations
};
