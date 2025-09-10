const express = require('express');
const router = express.Router();
const { 
  upload, 
  verifyStoreOwner, 
  getStoreProfile, 
  updateStoreProfile 
} = require('../controllers/storeProfileController');

// Get store profile - public endpoint
router.get('/:slug', getStoreProfile);

// Update store profile - protected endpoint
router.put('/:slug', verifyStoreOwner, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), updateStoreProfile);

module.exports = router;
