const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', authMiddleware, requireAdmin, upload.single('image'), categoryController.createCategory);
router.put('/:id', authMiddleware, requireAdmin, upload.single('image'), categoryController.updateCategory);
router.delete('/:id', authMiddleware, requireAdmin, categoryController.deleteCategory);

module.exports = router;
