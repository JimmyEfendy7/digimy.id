const express = require('express');
const router = express.Router();
const { 
  getStoreFinance, 
  getTransactionHistory, 
  createWithdrawal, 
  getRevenueAnalytics 
} = require('../controllers/financeController');
const { verifyMitra } = require('../middleware/authMiddleware');

// Get store financial summary
router.get('/store/:storeId', verifyMitra, getStoreFinance);

// Get detailed transaction history
router.get('/store/:storeId/transactions', verifyMitra, getTransactionHistory);

// Create withdrawal request
router.post('/store/:storeId/withdrawal', verifyMitra, createWithdrawal);

// Get revenue analytics
router.get('/store/:storeId/analytics', verifyMitra, getRevenueAnalytics);

module.exports = router;
