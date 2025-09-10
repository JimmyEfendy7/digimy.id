const express = require('express');
const router = express.Router();
const {
  upload,
  verifyStoreOwner,
  getStoreProducts,
  getProductCategories,
  addProduct,
  updateProduct,
  deleteProduct,
  getProduct,
  deleteProductReview
} = require('../controllers/storeProductController');

// Get product categories - public endpoint
router.get('/categories', getProductCategories);

// All routes below require store authentication
router.use(verifyStoreOwner);

// Get store products with pagination
router.get('/', getStoreProducts);

// Get single product
router.get('/:id', getProduct);

// Add new product with image upload and reviews
router.post('/', upload.fields([
  { name: 'poster', maxCount: 1 },
  { name: 'reviews', maxCount: 10 }
]), addProduct);

// Update product with optional image upload and reviews
router.put('/:id', upload.fields([
  { name: 'poster', maxCount: 1 },
  { name: 'reviews', maxCount: 10 }
]), updateProduct);

// Delete product
router.delete('/:id', deleteProduct);

// Delete product review media
router.delete('/:id/reviews/:reviewId', deleteProductReview);

module.exports = router;
