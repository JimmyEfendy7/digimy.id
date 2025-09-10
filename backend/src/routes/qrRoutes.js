const express = require('express');
const router = express.Router();
const { verifyMitra } = require('../middleware/authMiddleware');
const {
  getStoreScannedQRs,
  scanQRCode,
  getQRScanStats
} = require('../controllers/qrController');

// Get all scanned QR codes for store
router.get('/store/:storeId/scanned', verifyMitra, getStoreScannedQRs);

// Scan QR code
router.post('/store/:storeId/scan', verifyMitra, scanQRCode);

// Get QR scan statistics
router.get('/store/:storeId/stats', verifyMitra, getQRScanStats);

module.exports = router;
