const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAuth, requireStaff, requireAdmin } = require('../middleware/roleMiddleware');

// Public route to list active staff/admins for customer to select
router.get('/staff-list', chatController.getStaffList);

// Authenticated user routes (customer, staff, admin)
router.post('/send', authMiddleware, requireAuth, chatController.sendMessage);
router.get('/messages', authMiddleware, requireAuth, chatController.getMessages);
router.put('/read', authMiddleware, requireAuth, chatController.markAsRead);
router.get('/unread-count', authMiddleware, requireAuth, chatController.getUnreadCount);

// Staff and Admin routes
router.get('/conversations', authMiddleware, requireStaff, chatController.getConversations);

// Admin only routes
router.get('/all-conversations', authMiddleware, requireAdmin, chatController.getAllConversations);

module.exports = router;
