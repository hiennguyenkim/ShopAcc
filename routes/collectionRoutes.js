const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', collectionController.getCollections);
router.get('/slug/:slug', collectionController.getCollectionBySlug);
router.get('/:id', collectionController.getCollectionById);

router.post('/', authMiddleware, requireAdmin, upload.single('image'), collectionController.createCollection);
router.put('/:id', authMiddleware, requireAdmin, upload.single('image'), collectionController.updateCollection);
router.delete('/:id', authMiddleware, requireAdmin, collectionController.deleteCollection);

router.post('/:id/add-account', authMiddleware, requireAdmin, collectionController.addAccountToCollection);
router.delete('/:id/account/:accountId', authMiddleware, requireAdmin, collectionController.removeAccountFromCollection);

module.exports = router;
