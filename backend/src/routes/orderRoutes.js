const express = require('express');
const router = express.Router();
const { 
  getStoreOrders, 
  updateOrderItemStatus, 
  getOrderStats,
  refundOrderItem
} = require('../controllers/orderController');
const { verifyMitra } = require('../middleware/authMiddleware');

// Get orders for a specific store
router.get('/store/:storeId', verifyMitra, getStoreOrders);

// Update order item status
router.put('/store/:storeId/item/:itemId/status', verifyMitra, updateOrderItemStatus);

// Refund a canceled order item
router.post('/store/:storeId/item/:itemId/refund', verifyMitra, refundOrderItem);

// Get order statistics for dashboard
router.get('/store/:storeId/stats', verifyMitra, getOrderStats);

module.exports = router;
