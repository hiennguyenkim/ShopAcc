const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireStaff } = require('../middleware/roleMiddleware');

router.post('/', contactController.createMessage);
router.get('/', authMiddleware, requireStaff, contactController.getMessages);
router.put('/:id/status', authMiddleware, requireStaff, contactController.updateStatus);

module.exports = router;
