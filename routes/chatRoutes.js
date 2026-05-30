const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireStaff } = require('../middleware/roleMiddleware');

// Public / Guest friendly routes
router.get('/staff-list', chatController.getStaffList);
router.post('/send', authMiddleware, chatController.sendMessage); // authMiddleware sets req.user if token is present, but doesn't block guests
router.get('/room/:chatRoomId', chatController.getMessagesByRoom);

// Staff and Admin routes
router.get('/rooms', authMiddleware, requireStaff, chatController.getChatRooms);
router.post('/room/:chatRoomId/read', authMiddleware, requireStaff, chatController.markRoomAsRead);

module.exports = router;
