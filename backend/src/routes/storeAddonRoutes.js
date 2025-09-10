const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  upload,
  verifyStoreOwner,
  listProductAddons,
  createProductAddon,
  updateProductAddon,
  deleteProductAddon,
} = require('../controllers/storeAddonController');

// List addons for a product
router.get('/:productId/addons', verifyStoreOwner, listProductAddons);

// Create addon (with optional file upload under field name 'addon_url')
router.post('/:productId/addons', verifyStoreOwner, upload.single('addon_url'), createProductAddon);

// Update addon (optionally replace file)
router.put('/:productId/addons/:addonId', verifyStoreOwner, upload.single('addon_url'), updateProductAddon);

// Delete addon
router.delete('/:productId/addons/:addonId', verifyStoreOwner, deleteProductAddon);

module.exports = router;
