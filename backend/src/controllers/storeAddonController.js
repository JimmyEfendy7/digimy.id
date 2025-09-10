const pool = require('../db/connection');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Configure multer for addon file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/addons');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `addon-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, and WebP are allowed.'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Middleware to verify store owner
const verifyStoreOwner = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'mitra') {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const connection = await pool.getConnection();
    try {
      const [stores] = await connection.execute(
        'SELECT id, slug, name FROM stores WHERE id = ?',
        [decoded.id]
      );
      if (stores.length === 0) {
        return res.status(403).json({ success: false, message: 'Toko tidak ditemukan' });
      }
      req.store = stores[0];
      req.user = decoded;
      next();
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error verifying store owner:', error);
    return res.status(401).json({ success: false, message: 'Token tidak valid' });
  }
};

// Helper: ensure product belongs to current store
const ensureProductOwnership = async (connection, productId, storeId) => {
  const [rows] = await connection.execute(
    'SELECT id FROM products WHERE id = ? AND store_id = ?',
    [productId, storeId]
  );
  return rows.length > 0;
};

// List addons for a product (store scope)
const listProductAddons = async (req, res) => {
  try {
    const { productId } = req.params;
    const connection = await pool.getConnection();
    try {
      const owns = await ensureProductOwnership(connection, productId, req.store.id);
      if (!owns) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

      const [addons] = await connection.execute(
        'SELECT * FROM product_addons WHERE product_id = ? ORDER BY created_at DESC',
        [productId]
      );
      return res.json({ success: true, data: addons });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error listing product addons:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// Create addon
const createProductAddon = async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, description = '', price, is_active = 'true' } = req.body;

    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Nama dan harga addon wajib diisi' });
    }

    const connection = await pool.getConnection();
    try {
      const owns = await ensureProductOwnership(connection, productId, req.store.id);
      if (!owns) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

      let addonUrl = null;
      if (req.file) {
        // Store relative path for client usage
        addonUrl = `/addons/${req.file.filename}`;
      }

      // Generate slug per product
      const slugBase = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let slug = slugBase;
      let counter = 1;
      // Ensure unique (product_id, slug)
      while (true) {
        const [rows] = await connection.execute(
          'SELECT id FROM product_addons WHERE product_id = ? AND slug = ?',
          [productId, slug]
        );
        if (rows.length === 0) break;
        counter += 1;
        slug = `${slugBase}-${counter}`;
      }

      const [result] = await connection.execute(
        `INSERT INTO product_addons (product_id, name, slug, description, addon_url, price, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [productId, name, slug, description, addonUrl || '', parseFloat(price), is_active === 'true' || is_active === true]
      );

      return res.status(201).json({ success: true, data: { id: result.insertId } });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating product addon:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// Update addon
const updateProductAddon = async (req, res) => {
  try {
    const { productId, addonId } = req.params;
    const { name, description, price, is_active } = req.body;

    const connection = await pool.getConnection();
    try {
      const owns = await ensureProductOwnership(connection, productId, req.store.id);
      if (!owns) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

      // Ensure addon belongs to product
      const [addons] = await connection.execute(
        'SELECT * FROM product_addons WHERE id = ? AND product_id = ?',
        [addonId, productId]
      );
      if (addons.length === 0) return res.status(404).json({ success: false, message: 'Addon tidak ditemukan' });

      const addon = addons[0];
      let addonUrl = addon.addon_url;
      if (req.file) {
        // delete old file if exists and path is under /addons/
        if (addonUrl && addonUrl.includes('/addons/')) {
          try {
            const fullPath = path.join(__dirname, '../../public', addonUrl);
            await fs.unlink(fullPath).catch(() => {});
          } catch (e) {
            console.warn('Failed to delete old addon file:', e.message);
          }
        }
        addonUrl = `/addons/${req.file.filename}`;
      }

      // Build dynamic set clause
      const fields = [];
      const values = [];
      if (typeof name !== 'undefined') { fields.push('name = ?'); values.push(name); }
      if (typeof description !== 'undefined') { fields.push('description = ?'); values.push(description); }
      if (typeof price !== 'undefined') { fields.push('price = ?'); values.push(parseFloat(price)); }
      if (typeof is_active !== 'undefined') { fields.push('is_active = ?'); values.push(is_active === 'true' || is_active === true); }
      if (req.file) { fields.push('addon_url = ?'); values.push(addonUrl); }
      if (fields.length === 0) {
        return res.json({ success: true, message: 'Tidak ada perubahan' });
      }
      values.push(addonId);

      await connection.execute(
        `UPDATE product_addons SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      return res.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating product addon:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// Delete addon
const deleteProductAddon = async (req, res) => {
  try {
    const { productId, addonId } = req.params;
    const connection = await pool.getConnection();
    try {
      const owns = await ensureProductOwnership(connection, productId, req.store.id);
      if (!owns) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

      const [addons] = await connection.execute(
        'SELECT * FROM product_addons WHERE id = ? AND product_id = ?',
        [addonId, productId]
      );
      if (addons.length === 0) return res.status(404).json({ success: false, message: 'Addon tidak ditemukan' });

      const addon = addons[0];
      // delete file
      if (addon.addon_url && addon.addon_url.includes('/addons/')) {
        try {
          const fullPath = path.join(__dirname, '../../public', addon.addon_url);
          await fs.unlink(fullPath).catch(() => {});
        } catch (e) {
          console.warn('Failed to delete addon file:', e.message);
        }
      }

      await connection.execute('DELETE FROM product_addons WHERE id = ?', [addonId]);
      return res.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting product addon:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = {
  upload,
  verifyStoreOwner,
  listProductAddons,
  createProductAddon,
  updateProductAddon,
  deleteProductAddon,
};
