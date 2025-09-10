const express = require('express');
const router = express.Router();
const { verifyMitra } = require('../middleware/authMiddleware');
const {
  getStoreEmbedCodes,
  createEmbedCode,
  updateEmbedCode,
  deleteEmbedCode,
  toggleEmbedCodeStatus,
  getPublicEmbedCode,
  processEmbedPurchase
} = require('../controllers/embedController');

// Protected routes (require mitra authentication)
router.get('/store/:storeId/embed-codes', verifyMitra, getStoreEmbedCodes);
router.post('/store/:storeId/embed-codes', verifyMitra, createEmbedCode);
router.put('/store/:storeId/embed-codes/:embedCodeId', verifyMitra, updateEmbedCode);
router.delete('/store/:storeId/embed-codes/:embedCodeId', verifyMitra, deleteEmbedCode);
router.patch('/store/:storeId/embed-codes/:embedCodeId/toggle', verifyMitra, toggleEmbedCodeStatus);

// Public routes (no authentication required - for external website usage)
router.get('/public/:embedCode', getPublicEmbedCode);
router.post('/public/:embedCode/purchase', processEmbedPurchase);

module.exports = router;
