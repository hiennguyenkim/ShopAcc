const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

// POST /api/chat/send
// Anyone (guest or logged-in user) can send messages to a room
const sendMessage = async (req, res, next) => {
  try {
    const { chatRoomId, message, senderName } = req.body;

    if (!chatRoomId || !message) {
      return res.status(400).json({ success: false, message: 'Thiếu chatRoomId hoặc nội dung tin nhắn.' });
    }

    let finalSenderName = senderName || 'Khách';
    let finalSenderRole = 'guest';

    // If user is authenticated, override role and name securely
    if (req.user) {
      finalSenderName = req.user.fullName || req.user.username;
      finalSenderRole = req.user.role === 'admin' ? 'admin' : req.user.role === 'staff' ? 'staff' : 'customer';
    }

    const chatMsg = await ChatMessage.create({
      chatRoomId,
      senderName: finalSenderName,
      senderRole: finalSenderRole,
      message
    });

    res.status(201).json({
      success: true,
      message: chatMsg
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/chat/room/:chatRoomId
// Retrieve messages for a room
const getMessagesByRoom = async (req, res, next) => {
  try {
    const { chatRoomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const messages = await ChatMessage.find({ chatRoomId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Return chronological order for UI bubble flow
    messages.reverse();

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/chat/rooms [staff/admin]
// Retrieve all rooms with unread counts (customer/guest messages) and latest message details
const getChatRooms = async (req, res, next) => {
  try {
    const rooms = await ChatMessage.aggregate([
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: '$chatRoomId',
          latestMessage: { $last: '$message' },
          latestSenderName: { $last: '$senderName' },
          latestSenderRole: { $last: '$senderRole' },
          lastTime: { $last: '$createdAt' }
        }
      },
      { $sort: { lastTime: -1 } }
    ]);

    // Calculate unread customer/guest messages per room
    const roomsWithUnread = await Promise.all(rooms.map(async (room) => {
      const unreadCount = await ChatMessage.countDocuments({
        chatRoomId: room._id,
        senderRole: { $in: ['customer', 'guest'] },
        isRead: false
      });
      return {
        chatRoomId: room._id,
        latestMessage: room.latestMessage,
        latestSenderName: room.latestSenderName,
        latestSenderRole: room.latestSenderRole,
        lastTime: room.lastTime,
        unreadCount
      };
    }));

    res.status(200).json({
      success: true,
      rooms: roomsWithUnread
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/chat/room/:chatRoomId/read [staff/admin]
// Mark customer/guest messages in a room as read
const markRoomAsRead = async (req, res, next) => {
  try {
    const { chatRoomId } = req.params;

    await ChatMessage.updateMany(
      { chatRoomId, senderRole: { $in: ['customer', 'guest'] }, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu đã đọc các tin nhắn trong phòng.'
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

module.exports = {
  sendMessage,
  getMessagesByRoom,
  getChatRooms,
  markRoomAsRead,
  getStaffList
};
