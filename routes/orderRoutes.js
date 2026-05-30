const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAuth, requireStaff } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/', authMiddleware, requireAuth, orderController.createOrder);
router.get('/', authMiddleware, requireStaff, orderController.getOrders);
router.get('/my-orders', authMiddleware, requireAuth, orderController.getMyOrders);
router.post('/manual', authMiddleware, requireStaff, orderController.createManualOrder);
router.post('/direct-handover', authMiddleware, requireStaff, orderController.directHandover);
router.get('/:id', authMiddleware, requireAuth, orderController.getOrderById);
router.put('/:id/status', authMiddleware, requireStaff, orderController.updateOrderStatus);
router.put('/:id/cancel', authMiddleware, requireAuth, orderController.cancelOrder);
router.post('/track', orderController.trackOrder);
router.post('/:id/payment-proof', authMiddleware, requireAuth, upload.single('paymentProof'), orderController.uploadPaymentProof);
router.put('/:id/confirm-payment', authMiddleware, requireStaff, orderController.confirmPayment);
router.put('/:id/cancel-payment', authMiddleware, requireStaff, orderController.cancelPayment);
router.put('/:id/request-reupload', authMiddleware, requireStaff, orderController.requestReupload);
router.put('/:id/deliver', authMiddleware, requireStaff, orderController.deliverOrder);

module.exports = router;
