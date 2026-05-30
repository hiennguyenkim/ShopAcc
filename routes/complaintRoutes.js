const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAuth, requireStaff } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/', authMiddleware, requireAuth, upload.array('evidenceImages', 5), complaintController.createComplaint);
router.get('/my-complaints', authMiddleware, requireAuth, complaintController.getMyComplaints);
router.get('/', authMiddleware, requireStaff, complaintController.getAllComplaints);
router.get('/:id', authMiddleware, requireAuth, complaintController.getComplaintById);
router.put('/:id/resolve', authMiddleware, requireStaff, complaintController.resolveComplaint);

module.exports = router;
