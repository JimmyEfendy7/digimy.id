const pool = require('../db/connection');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Configure multer for product image uploads and reviews
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    let uploadDir;
    
    if (file.fieldname === 'poster') {
      // Product posters go to /public/products/
      uploadDir = path.join(__dirname, '../../public/products');
    } else if (file.fieldname === 'reviews') {
      // Product reviews go to /public/reviews/
      uploadDir = path.join(__dirname, '../../public/reviews');
    } else {
      return cb(new Error('Invalid field name'));
    }
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    
    let filename;
    if (file.fieldname === 'poster') {
      filename = `product-${uniqueSuffix}${ext}`;
    } else if (file.fieldname === 'reviews') {
      filename = `review-${uniqueSuffix}${ext}`;
    } else {
      return cb(new Error('Invalid field name'));
    }
    
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPG, and WebP are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'poster') {
      // Product poster - images only
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid poster file type. Only PNG, JPG, and WebP are allowed.'), false);
      }
    } else if (file.fieldname === 'reviews') {
      // Product reviews - images and videos
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'video/mp4', 'video/avi', 'video/mov', 'video/wmv'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid review file type. Only PNG, JPG, WebP, MP4, AVI, MOV, WMV are allowed.'), false);
      }
    } else {
      cb(new Error('Unknown field name'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for review videos
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

// Get products for a store with pagination
const getStoreProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;
    
    const connection = await pool.getConnection();
    
    try {
      // Get total count
      const [countResult] = await connection.execute(
        'SELECT COUNT(*) as total FROM products WHERE store_id = ?',
        [req.store.id]
      );
      const total = countResult[0].total;
      
      // Get products with pagination
      const [products] = await connection.execute(`
        SELECT p.*, pc.name as category_name 
        FROM products p 
        LEFT JOIN product_categories pc ON p.category_id = pc.id 
        WHERE p.store_id = ? 
        ORDER BY p.created_at DESC 
        LIMIT ? OFFSET ?
      `, [req.store.id, parseInt(limit), parseInt(offset)]);
      
      // Debug: Log first product to verify promo fields
      if (products.length > 0) {
        console.log('[DEBUG] getStoreProducts - Sample product data:', {
          id: products[0].id,
          name: products[0].name,
          price: products[0].price,
          promo_price: products[0].promo_price,
          total_products: products.length
        });
      }
      
      return res.json({
        success: true,
        data: products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error getting store products:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// Get product categories
const getProductCategories = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      const [categories] = await connection.execute(
        'SELECT * FROM product_categories WHERE is_active = TRUE ORDER BY name ASC'
      );
      
      return res.json({
        success: true,
        data: categories
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error getting product categories:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// Add new product
const addProduct = async (req, res) => {
  try {
    const { name, description, category_id, price, promo_price, stock, is_active, is_appointment } = req.body;
    
    // Validation
    if (!name || !category_id || !price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nama produk, kategori, dan harga wajib diisi' 
      });
    }
    
    if (parseFloat(price) <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Harga harus lebih dari 0' 
      });
    }
    
    if (promo_price && parseFloat(promo_price) >= parseFloat(price)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Harga promo harus lebih kecil dari harga normal' 
      });
    }
    
    const connection = await pool.getConnection();
    
    try {
      // Generate slug from product name
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
      
      // Ensure unique slug
      let finalSlug = slug;
      let counter = 1;
      
      while (true) {
        const [existing] = await connection.execute(
          'SELECT id FROM products WHERE slug = ?',
          [finalSlug]
        );
        
        if (existing.length === 0) break;
        
        finalSlug = `${slug}-${counter}`;
        counter++;
      }
      
      // Check if store is verified to auto-verify products
      const [storeData] = await connection.execute(
        'SELECT is_verified FROM stores WHERE id = ?',
        [req.store.id]
      );
      
      const isStoreVerified = storeData.length > 0 && storeData[0].is_verified;
      
      // Handle poster image upload
      let posterUrl = null;
      if (req.files && req.files.poster && req.files.poster[0]) {
        posterUrl = `/products/${req.files.poster[0].filename}`;
      }
      
      // If no poster provided, set a default or require it
      if (!posterUrl) {
        return res.status(400).json({ 
          success: false, 
          message: 'Gambar produk wajib diupload' 
        });
      }
      
      // Insert product with auto-verification for verified stores
      const [result] = await connection.execute(`
        INSERT INTO products (
          category_id, store_id, name, slug, description, poster_url, 
          price, promo_price, stock, is_official, is_verified, is_active, is_appointment,
          created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?, ?, 'store', NOW())
      `, [
        category_id,
        req.store.id,
        name,
        finalSlug,
        description || null,
        posterUrl,
        parseFloat(price),
        promo_price ? parseFloat(promo_price) : null,
        stock ? parseInt(stock) : 1,
        isStoreVerified ? 1 : 0,  // Auto-verify if store is verified
        is_active === 'true' || is_active === true ? 1 : 0,  // Convert to boolean
        is_appointment === 'true' || is_appointment === true ? 1 : 0  // Convert to boolean
      ]);
      
      const productId = result.insertId;
      
      // Handle product reviews upload
      if (req.files && req.files.reviews && req.files.reviews.length > 0) {
        const reviewInserts = [];
        
        for (const file of req.files.reviews) {
          const fileUrl = `/reviews/${file.filename}`;
          const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
          
          reviewInserts.push([
            productId,
            fileUrl,
            fileType
          ]);
        }
        
        // Insert product reviews
        if (reviewInserts.length > 0) {
          const placeholders = reviewInserts.map(() => '(?, ?, ?)').join(', ');
          const values = reviewInserts.flat();
          await connection.execute(
            `INSERT INTO product_reviews (product_id, file_url, file_type) VALUES ${placeholders}`,
            values
          );
        }
      }
      
      // Get the created product
      const [products] = await connection.execute(`
        SELECT p.*, pc.name as category_name 
        FROM products p 
        LEFT JOIN product_categories pc ON p.category_id = pc.id 
        WHERE p.id = ?
      `, [productId]);
      
      return res.status(201).json({
        success: true,
        message: 'Produk berhasil ditambahkan',
        data: products[0]
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error adding product:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category_id, price, promo_price, stock, is_active, is_appointment } = req.body;
    
    const connection = await pool.getConnection();
    
    try {
      // Check if product belongs to this store
      const [products] = await connection.execute(
        'SELECT * FROM products WHERE id = ? AND store_id = ?',
        [id, req.store.id]
      );
      
      if (products.length === 0) {
        return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
      }
      
      const product = products[0];
      
      // Prepare update data
      const updateData = {};
      const params = [];
      const fields = [];
      
      if (name && name.trim()) {
        updateData.name = name.trim();
        fields.push('name = ?');
        params.push(updateData.name);
        
        // Update slug if name changed
        if (name !== product.name) {
          const slug = name.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
          
          let finalSlug = slug;
          let counter = 1;
          
          while (true) {
            const [existing] = await connection.execute(
              'SELECT id FROM products WHERE slug = ? AND id != ?',
              [finalSlug, id]
            );
            
            if (existing.length === 0) break;
            
            finalSlug = `${slug}-${counter}`;
            counter++;
          }
          
          fields.push('slug = ?');
          params.push(finalSlug);
        }
      }
      
      if (description !== undefined) {
        fields.push('description = ?');
        params.push(description?.trim() || null);
      }
      
      if (category_id) {
        fields.push('category_id = ?');
        params.push(parseInt(category_id));
      }
      
      if (price) {
        if (parseFloat(price) <= 0) {
          return res.status(400).json({ 
            success: false, 
            message: 'Harga harus lebih dari 0' 
          });
        }
        fields.push('price = ?');
        params.push(parseFloat(price));
      }
      
      // Handle promo price update
      if (promo_price !== undefined) {
        // If promo_price is an empty string, set it to null
        if (promo_price === '') {
          fields.push('promo_price = ?');
          params.push(null);
        } 
        // If promo_price has a value, validate it
        else if (promo_price) {
          const currentPrice = price ? parseFloat(price) : product.price;
          const promoPriceValue = parseFloat(promo_price);
          
          if (isNaN(promoPriceValue) || promoPriceValue <= 0) {
            return res.status(400).json({ 
              success: false, 
              message: 'Harga promo harus berupa angka yang lebih besar dari 0' 
            });
          }
          
          if (promoPriceValue >= currentPrice) {
            return res.status(400).json({ 
              success: false, 
              message: 'Harga promo harus lebih kecil dari harga normal' 
            });
          }
          
          fields.push('promo_price = ?');
          params.push(promoPriceValue);
        }
      }
      
      if (stock !== undefined) {
        fields.push('stock = ?');
        params.push(parseInt(stock) || 0);
      }
      
      if (is_active !== undefined) {
        console.log('🔧 DEBUG is_active received:', is_active, 'type:', typeof is_active);
        fields.push('is_active = ?');
        // Properly convert string boolean to actual boolean
        const isActiveValue = is_active === 'true' || is_active === true || is_active === '1' || is_active === 1;
        console.log('🔧 DEBUG isActiveValue converted:', isActiveValue, 'will save as:', isActiveValue ? 1 : 0);
        params.push(isActiveValue ? 1 : 0);
      }
      
      if (is_appointment !== undefined) {
        console.log('🔧 DEBUG is_appointment received:', is_appointment, 'type:', typeof is_appointment);
        fields.push('is_appointment = ?');
        // Properly convert string boolean to actual boolean
        const isAppointmentValue = is_appointment === 'true' || is_appointment === true || is_appointment === '1' || is_appointment === 1;
        console.log('🔧 DEBUG isAppointmentValue converted:', isAppointmentValue, 'will save as:', isAppointmentValue ? 1 : 0);
        params.push(isAppointmentValue ? 1 : 0);
      }
      
      // Handle poster image upload (optional for update)
      if (req.files && req.files.poster && req.files.poster[0]) {
        fields.push('poster_url = ?');
        params.push(`/products/${req.files.poster[0].filename}`);
        
        // Delete old image if exists
        if (product.poster_url) {
          try {
            const oldImagePath = path.join(__dirname, '../../public', product.poster_url);
            await fs.unlink(oldImagePath);
          } catch (err) {
            console.log('Could not delete old image:', err.message);
          }
        }
      }
      
      // Handle batched review deletions (reviews marked for deletion in frontend)
      if (req.body.reviewsToDelete) {
        try {
          const reviewsToDelete = JSON.parse(req.body.reviewsToDelete);
          console.log(`[DEBUG] Processing ${reviewsToDelete.length} reviews for deletion:`, reviewsToDelete);
          
          if (reviewsToDelete.length > 0) {
            // Get review file paths before deletion
            const placeholders = reviewsToDelete.map(() => '?').join(', ');
            const [reviewFiles] = await connection.execute(
              `SELECT id, file_url FROM product_reviews WHERE id IN (${placeholders}) AND product_id = ?`,
              [...reviewsToDelete, id]
            );
            
            // Delete from database
            await connection.execute(
              `DELETE FROM product_reviews WHERE id IN (${placeholders}) AND product_id = ?`,
              [...reviewsToDelete, id]
            );
            
            // Delete physical files
            for (const review of reviewFiles) {
              if (review.file_url) {
                try {
                  const filePath = path.join(__dirname, '../../public', review.file_url);
                  await fs.unlink(filePath);
                  console.log(`[DEBUG] Deleted review file: ${filePath}`);
                } catch (err) {
                  console.log(`[DEBUG] Could not delete review file: ${err.message}`);
                }
              }
            }
            
            console.log(`[DEBUG] Successfully processed ${reviewFiles.length} review deletions`);
          }
        } catch (parseErr) {
          console.error('[ERROR] Failed to parse reviewsToDelete:', parseErr.message);
        }
      }
      
      // Handle product reviews upload (add new reviews alongside existing ones)
      if (req.files && req.files.reviews && req.files.reviews.length > 0) {
        // Insert new reviews (existing reviews are preserved)
        const reviewInserts = [];
        for (const file of req.files.reviews) {
          const fileUrl = `/reviews/${file.filename}`;
          const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
          
          reviewInserts.push([
            id,
            fileUrl,
            fileType
          ]);
        }
        
        if (reviewInserts.length > 0) {
          const placeholders = reviewInserts.map(() => '(?, ?, ?)').join(', ');
          const values = reviewInserts.flat();
          await connection.execute(
            `INSERT INTO product_reviews (product_id, file_url, file_type) VALUES ${placeholders}`,
            values
          );
        }
      }
      
      if (fields.length === 0) {
        return res.status(400).json({ success: false, message: 'Tidak ada data yang diupdate' });
      }
      
      // Add updated_at field
      fields.push('updated_at = NOW()');
      params.push(id);
      
      const query = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
      await connection.execute(query, params);
      
      // Get updated product
      const [updatedProducts] = await connection.execute(`
        SELECT p.*, pc.name as category_name 
        FROM products p 
        LEFT JOIN product_categories pc ON p.category_id = pc.id 
        WHERE p.id = ?
      `, [id]);
      
      return res.json({
        success: true,
        message: 'Produk berhasil diupdate',
        data: updatedProducts[0]
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const connection = await pool.getConnection();
    
    try {
      // Check if product belongs to this store
      const [products] = await connection.execute(
        'SELECT * FROM products WHERE id = ? AND store_id = ?',
        [id, req.store.id]
      );
      
      if (products.length === 0) {
        return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
      }
      
      const product = products[0];
      
      // Get all review media files before deleting the product
      const [reviewFiles] = await connection.execute(
        'SELECT file_url FROM product_reviews WHERE product_id = ?',
        [id]
      );
      
      // Delete product from database (this will also delete related reviews due to foreign key constraints)
      await connection.execute('DELETE FROM products WHERE id = ?', [id]);
      
      // Delete product poster image if exists
      if (product.poster_url) {
        try {
          const imagePath = path.join(__dirname, '../../public', product.poster_url);
          await fs.unlink(imagePath);
          console.log(`[DEBUG] Deleted product poster: ${imagePath}`);
        } catch (err) {
          console.log('Could not delete product image:', err.message);
        }
      }
      
      // Delete all review media files
      if (reviewFiles.length > 0) {
        console.log(`[DEBUG] Deleting ${reviewFiles.length} review media files for product ${id}`);
        for (const review of reviewFiles) {
          if (review.file_url) {
            try {
              const filePath = path.join(__dirname, '../../public', review.file_url);
              await fs.unlink(filePath);
              console.log(`[DEBUG] Deleted review media: ${filePath}`);
            } catch (err) {
              console.log(`Could not delete review media file: ${err.message}`);
            }
          }
        }
      }
      
      return res.json({
        success: true,
        message: 'Produk berhasil dihapus'
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// Get single product details
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const connection = await pool.getConnection();
    
    try {
      const [products] = await connection.execute(`
        SELECT p.*, pc.name as category_name 
        FROM products p 
        LEFT JOIN product_categories pc ON p.category_id = pc.id 
        WHERE p.id = ? AND p.store_id = ?
      `, [id, req.store.id]);
      
      if (products.length === 0) {
        return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
      }
      
      // Get product reviews/media
      const [reviews] = await connection.execute(`
        SELECT id, file_url, file_type 
        FROM product_reviews 
        WHERE product_id = ?
        ORDER BY id ASC
      `, [id]);
      
      const product = products[0];
      product.reviews = reviews;
      
      return res.json({
        success: true,
        data: product
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error getting product:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// Delete product review media
const deleteProductReview = async (req, res) => {
  try {
    const { id: productId, reviewId } = req.params;
    console.log(`[DEBUG] Delete review request - ProductID: ${productId}, ReviewID: ${reviewId}`);
    console.log(`[DEBUG] Store ID from middleware: ${req.store?.id}`);
    
    const connection = await pool.getConnection();
    
    try {
      // Check if product belongs to this store
      const [products] = await connection.execute(
        'SELECT * FROM products WHERE id = ? AND store_id = ?',
        [productId, req.store.id]
      );
      
      if (products.length === 0) {
        return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
      }
      
      // Get review details before deleting
      const [reviews] = await connection.execute(
        'SELECT * FROM product_reviews WHERE id = ? AND product_id = ?',
        [reviewId, productId]
      );
      
      if (reviews.length === 0) {
        return res.status(404).json({ success: false, message: 'Review media tidak ditemukan' });
      }
      
      const review = reviews[0];
      
      // Delete from database
      await connection.execute('DELETE FROM product_reviews WHERE id = ?', [reviewId]);
      
      // Delete file from filesystem
      if (review.file_url) {
        try {
          const filePath = path.join(__dirname, '../../public', review.file_url);
          console.log(`[DEBUG] Attempting to delete file: ${filePath}`);
          console.log(`[DEBUG] Review file_url: ${review.file_url}`);
          
          // Check if file exists before attempting to delete
          try {
            await fs.access(filePath);
            console.log(`[DEBUG] File exists, proceeding with deletion`);
          } catch (accessErr) {
            console.log(`[DEBUG] File does not exist at path: ${filePath}`);
            // File doesn't exist, but that's okay - maybe already deleted
          }
          
          await fs.unlink(filePath);
          console.log(`[DEBUG] File deleted successfully: ${filePath}`);
        } catch (err) {
          console.error(`[ERROR] Could not delete review file: ${err.message}`);
          console.error(`[ERROR] File path attempted: ${path.join(__dirname, '../../public', review.file_url)}`);
          // Don't fail the entire operation if file deletion fails
        }
      } else {
        console.log(`[DEBUG] No file_url provided for review ID: ${reviewId}`);
      }
      
      return res.json({
        success: true,
        message: 'Review media berhasil dihapus'
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting product review:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = {
  upload,
  verifyStoreOwner,
  getStoreProducts,
  getProductCategories,
  addProduct,
  updateProduct,
  deleteProduct,
  getProduct,
  deleteProductReview
};
