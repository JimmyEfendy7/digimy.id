const express = require('express');
const router = express.Router();

// Import controllers
const productCategoryController = require('../controllers/productCategoryController');
const productController = require('../controllers/productController');
const serviceController = require('../controllers/serviceController');
const auctionController = require('../controllers/auctionController');
const storeController = require('../controllers/storeController');
const midtransController = require('../controllers/midtransController');
const authController = require('../controllers/authController');

// Import route modules
const orderRoutes = require('./orderRoutes');
const financeRoutes = require('./financeRoutes');
const embedRoutes = require('./embedRoutes');
const storeProductRoutes = require('./storeProductRoutes'); // Re-enabled for mitra dashboard
const storeProfileRoutes = require('./storeProfileRoutes'); // Add missing store profile routes
const storeAddonRoutes = require('./storeAddonRoutes'); // Product Addons routes

// Auth Routes (OTP via WhatsApp)
router.post('/auth/send-otp/login', authController.sendLoginOtp);
router.post('/auth/verify-otp/login', authController.verifyLoginOtp);
router.post('/auth/send-otp/register', authController.sendRegisterOtp);
router.post('/auth/register/user', authController.registerUser);
router.post('/auth/register/store', authController.registerStore);

// Product Category Routes
router.get('/product-categories', productCategoryController.getAllCategories);
router.get('/product-categories/:id', productCategoryController.getCategoryById);
router.get('/product-categories/:id/products', productCategoryController.getProductsByCategory);

// Product Routes
router.get('/products', productController.getAllProducts);
router.get('/products/search', productController.searchProducts);
router.get('/products/official-stats', productController.getOfficialProductsStats);
router.get('/products/:id', productController.getProductById);
router.get('/products/:productId/reviews', productController.getProductReviews);

// Service Category Routes
router.get('/service-categories', serviceController.getAllServiceCategories);
router.get('/service-categories/:id/subcategories', serviceController.getSubcategoriesByCategory);

// Service Subcategory Routes
router.get('/service-subcategories/:id/services', serviceController.getServicesBySubcategory);

// Service Routes
router.get('/services', serviceController.getAllServices);
router.get('/services/popular', serviceController.getPopularServices);
router.get('/services/search', serviceController.searchServices);
router.get('/services/:id', serviceController.getServiceById);

// Store Routes
router.get('/stores/:id', storeController.getStoreById);
router.get('/stores/:id/stats', storeController.getStoreStats);
router.get('/stores/:id/similar-products', storeController.getSimilarProducts);
router.get('/stores/:id/products', storeController.getStoreProducts);

// Auction Routes
router.get('/auctions', auctionController.getActiveAuctions);
router.get('/auctions/pending', auctionController.getPendingAuctions);
router.get('/auctions/:id', auctionController.getAuctionById);
router.post('/auctions/:id/bid', auctionController.submitBid);

// Midtrans Payment Routes
router.post('/snap/token', midtransController.generateSnapToken);
router.post('/payment-notification', midtransController.handleNotification);
router.post('/payment-callback', midtransController.handleNotification);
router.get('/transactions/status/:order_id', midtransController.checkTransactionStatus);

// Store Product Routes
router.use('/store-products', storeProductRoutes); // Re-enabled for mitra dashboard

// Store Profile Routes
router.use('/store-profile', storeProfileRoutes); // Add missing store profile routes

// Store Addon Routes
router.use('/store-addons', storeAddonRoutes); // Product addons CRUD

// Order Management Routes
router.use('/orders', orderRoutes);

// Finance Management Routes
router.use('/finance', financeRoutes);

// Embed Routes
router.use('/embed', embedRoutes);

// QR Code Routes
const qrRoutes = require('./qrRoutes');
router.use('/qr', qrRoutes);

// Endpoint baru untuk pengecekan transaksi
router.get('/transactions/check-pending', midtransController.checkPendingTransactions);
router.get('/transactions/check-by-token/:token', midtransController.checkByPaymentToken);
router.get('/transactions/invoice/:transaction_id', midtransController.generateInvoice);
router.post('/transactions/check-manual/:transaction_code', midtransController.checkManualTransaction);
router.post('/transactions/update-status/:transaction_code', midtransController.updateTransactionStatusManual);

// Endpoint untuk admin - update semua transaksi pending
router.get('/admin/update-all-pending-transactions', midtransController.updateAllPendingTransactions);

// Status check route
router.get('/status', (req, res) => {
  console.log('✅ API Status check...');
  res.status(200).json({
    success: true,
    message: 'DIGIPRO API is running',
    timestamp: new Date(),
    environment: process.env.NODE_ENV
  });
});

module.exports = router; 