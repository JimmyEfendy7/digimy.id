const pool = require('../db/connection');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/stores');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const { slug } = req.params;
    const fileType = file.fieldname; // 'logo' or 'banner'
    const ext = path.extname(file.originalname);
    const filename = `${slug}-${fileType}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPG, SVG, and WebP are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
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

    const { slug } = req.params;
    const connection = await pool.getConnection();
    
    try {
      const [stores] = await connection.execute(
        'SELECT id, slug FROM stores WHERE id = ? AND slug = ?',
        [decoded.id, slug]
      );
      
      if (stores.length === 0) {
        return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke toko ini' });
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

// Get store profile
const getStoreProfile = async (req, res) => {
  try {
    const { slug } = req.params;
    const connection = await pool.getConnection();
    
    try {
      const [stores] = await connection.execute(
        'SELECT * FROM stores WHERE slug = ?',
        [slug]
      );
      
      if (stores.length === 0) {
        return res.status(404).json({ success: false, message: 'Toko tidak ditemukan' });
      }
      
      const store = stores[0];
      
      return res.json({
        success: true,
        data: {
          id: store.id,
          name: store.name,
          slug: store.slug,
          description: store.description,
          logo: store.logo,
          banner: store.banner,
          phone_number: store.phone_number,
          email: store.email,
          address: store.address,
          is_verified: store.is_verified,
          is_active: store.is_active,
          balance: store.balance
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error getting store profile:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// Update store profile
const updateStoreProfile = async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, description, email, address } = req.body;
    
    const connection = await pool.getConnection();
    
    try {
      // Prepare update data
      const updateData = {};
      const params = [];
      const fields = [];
      
      if (name && name.trim()) {
        updateData.name = name.trim();
        fields.push('name = ?');
        params.push(updateData.name);
      }
      
      if (description !== undefined) {
        updateData.description = description?.trim() || null;
        fields.push('description = ?');
        params.push(updateData.description);
      }
      
      if (email && email.trim()) {
        updateData.email = email.trim();
        fields.push('email = ?');
        params.push(updateData.email);
      }
      
      if (address !== undefined) {
        updateData.address = address?.trim() || null;
        fields.push('address = ?');
        params.push(updateData.address);
      }
      
      // Handle file uploads
      if (req.files) {
        if (req.files.logo) {
          const logoPath = `/stores/${slug}-logo${path.extname(req.files.logo[0].originalname)}`;
          updateData.logo = logoPath;
          fields.push('logo = ?');
          params.push(updateData.logo);
        }
        
        if (req.files.banner) {
          const bannerPath = `/stores/${slug}-banner${path.extname(req.files.banner[0].originalname)}`;
          updateData.banner = bannerPath;
          fields.push('banner = ?');
          params.push(updateData.banner);
        }
      }
      
      if (fields.length === 0) {
        return res.status(400).json({ success: false, message: 'Tidak ada data yang diupdate' });
      }
      
      // Add updated_at field
      fields.push('updated_at = NOW()');
      params.push(req.store.id);
      
      const query = `UPDATE stores SET ${fields.join(', ')} WHERE id = ?`;
      await connection.execute(query, params);
      
      // Get updated store data
      const [updatedStores] = await connection.execute(
        'SELECT * FROM stores WHERE id = ?',
        [req.store.id]
      );
      
      const updatedStore = updatedStores[0];
      
      return res.json({
        success: true,
        message: 'Profil toko berhasil diupdate',
        data: {
          id: updatedStore.id,
          name: updatedStore.name,
          slug: updatedStore.slug,
          description: updatedStore.description,
          logo: updatedStore.logo,
          banner: updatedStore.banner,
          phone_number: updatedStore.phone_number,
          email: updatedStore.email,
          address: updatedStore.address,
          is_verified: updatedStore.is_verified,
          is_active: updatedStore.is_active,
          balance: updatedStore.balance
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating store profile:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = {
  upload,
  verifyStoreOwner,
  getStoreProfile,
  updateStoreProfile
};
