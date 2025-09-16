const { Product, ProductReview, Store } = require('../models');

/**
 * Get all products
 * @param {object} req - Express request object with optional query parameters:
 *   - limit {number} - Number of products to return (default: 10)
 *   - page {number} - Page number (default: 1)
 *   - category_id {string} - Filter by category ID
 *   - is_official {boolean} - Filter official products (true/false)
 * @param {object} res - Express response object
 */
const getAllProducts = async (req, res) => {
  try {
    // Query parameters
    const { limit = 10, page = 1, category_id, is_official } = req.query;
    const offset = (page - 1) * limit;
    
    console.log('🔍 [DEBUG] getAllProducts called with params:', { limit, page, category_id, is_official });
    
    // First, let's do a simple direct query to see if products exist at all
    const simpleCountSql = 'SELECT COUNT(*) as total FROM products';
    const allProductsCount = await Product.query(simpleCountSql);
    console.log('🔍 [DEBUG] Total products in database:', allProductsCount[0].total);
    
    const activeVerifiedCountSql = 'SELECT COUNT(*) as total FROM products WHERE is_active = 1 AND is_verified = 1';
    const activeVerifiedCount = await Product.query(activeVerifiedCountSql);
    console.log('🔍 [DEBUG] Active & verified products:', activeVerifiedCount[0].total);
    
    // Check stores verification
    const storesCountSql = 'SELECT COUNT(*) as total FROM stores WHERE is_verified = 1';
    const verifiedStoresCount = await Product.query(storesCountSql);
    console.log('🔍 [DEBUG] Verified stores:', verifiedStoresCount[0].total);
    
    // Try simple query without complex joins first
    const simpleProductsSql = `
      SELECT p.id, p.name, p.price, p.is_active, p.is_verified, p.store_id, p.created_at
      FROM products p
      WHERE p.is_active = 1 AND p.is_verified = 1
      ORDER BY p.created_at DESC
      LIMIT ?
    `;
    
    const simpleProducts = await Product.query(simpleProductsSql, [parseInt(limit)]);
    console.log('🔍 [DEBUG] Simple products query result count:', simpleProducts.length);
    
    if (simpleProducts.length > 0) {
      console.log('🔍 [DEBUG] First product sample:', {
        id: simpleProducts[0].id,
        name: simpleProducts[0].name,
        is_active: simpleProducts[0].is_active,
        is_verified: simpleProducts[0].is_verified,
        store_id: simpleProducts[0].store_id
      });
    }
    
    // Now try the complex query with store verification
    const complexSql = `
      SELECT p.*, pc.name as category_name, s.is_verified as store_is_verified
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE p.is_active = 1 
      AND p.is_verified = 1
      AND (p.store_id IS NULL OR s.is_verified = 1)
      ${category_id ? `AND p.category_id = ${parseInt(category_id)}` : ''}
      ${is_official !== undefined ? `AND p.is_official = ${is_official === 'true' ? 1 : 0}` : ''}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const products = await Product.query(complexSql, [parseInt(limit), parseInt(offset)]);
    console.log('🔍 [DEBUG] Complex query result count:', products.length);
    
    // Get total count for pagination
    const countSql = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE p.is_active = 1 
      AND p.is_verified = 1
      AND (p.store_id IS NULL OR s.is_verified = 1)
      ${category_id ? `AND p.category_id = ${parseInt(category_id)}` : ''}
      ${is_official !== undefined ? `AND p.is_official = ${is_official === 'true' ? 1 : 0}` : ''}
    `;
    const countResult = await Product.query(countSql);
    const total = countResult[0].total;
    
    console.log(`📦 [DEBUG] Final result: ${products.length} produk (page ${page}, limit ${limit}, total: ${total})`);
    
    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit)
      },
      debug: {
        totalProductsInDb: allProductsCount[0].total,
        activeVerifiedProducts: activeVerifiedCount[0].total,
        verifiedStores: verifiedStoresCount[0].total,
        simpleQueryCount: simpleProducts.length,
        complexQueryCount: products.length
      }
    });
  } catch (error) {
    console.error('❌ Error saat mengambil produk:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {},
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get product by ID
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get product with category information and store verification
    const sql = `
      SELECT p.*, pc.name as category_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE p.id = ?
      AND (p.store_id IS NULL OR s.is_verified = 1)
    `;
    
    const products = await Product.query(sql, [id]);
    const product = products.length > 0 ? products[0] : null;
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan'
      });
    }
    
    // Get product reviews
    const reviews = await ProductReview.findAll({
      where: { product_id: id }
    });
    
    // Get store (if exists)
    let store = null;
    if (product.store_id) {
      store = await Store.findById(product.store_id);
    }
    
    // Get testimonials
    const { Testimonial } = require('../models');
    const testimonials = await Testimonial.findAll({
      where: {
        product_id: id,
        is_approved: true
      }
    });
    
    console.log(`📦 Mengambil produk dengan ID: ${id}`);
    return res.status(200).json({
      success: true,
      data: {
        product,
        reviews,
        store,
        testimonials
      }
    });
  } catch (error) {
    console.error(`❌ Error saat mengambil produk ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Search products
 */
const searchProducts = async (req, res) => {
  try {
    const { keyword, limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'Kata kunci pencarian diperlukan'
      });
    }
    
    // Custom SQL query for search with category join and store verification
    const sql = `
      SELECT p.*, pc.name as category_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE (p.name LIKE ? OR p.description LIKE ?) 
      AND p.is_active = 1 AND p.is_verified = 1
      AND (p.store_id IS NULL OR s.is_verified = 1)
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    // Run the search query with parameter binding
    const searchTerm = `%${keyword}%`;
    const values = [searchTerm, searchTerm, parseInt(limit), parseInt(offset)];
    
    const products = await Product.query(sql, values);
    
    console.log(`🔍 Mencari produk dengan kata kunci "${keyword}" - menemukan ${products.length} hasil`);
    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ Error saat mencari produk:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get product reviews by product ID
 */
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan'
      });
    }
    
    // Get product reviews
    const reviews = await ProductReview.findAll({
      where: { product_id: productId }
    });
    
    // Map absolute URLs for file paths
    const reviewsWithAbsolutePaths = reviews.map(review => {
      // Determine if the path is already absolute (starts with http or https)
      const isAbsolutePath = review.file_url.startsWith('http://') || review.file_url.startsWith('https://');
      
      // If already absolute, use as is. Otherwise, prepend the base URL
      let fileUrl = review.file_url;
      
      if (!isAbsolutePath) {
        // Check if file path already includes the /reviews/ directory
        if (fileUrl.includes('/reviews/')) {
          fileUrl = `${process.env.APP_URL || process.env.BASE_URL}/public${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
        } else {
          fileUrl = `${process.env.APP_URL || process.env.BASE_URL}/public/reviews/${fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl}`;
        }
      }
      
      return {
        ...review,
        file_url: fileUrl
      };
    });
    
    console.log(`🖼️ Mengambil ${reviews.length} review untuk produk ID: ${productId}`);
    return res.status(200).json({
      success: true,
      data: reviewsWithAbsolutePaths
    });
  } catch (error) {
    console.error(`❌ Error saat mengambil review produk ID ${req.params.productId}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get statistics for official products (total paid and pending orders)
 */
const getOfficialProductsStats = async (req, res) => {
  try {
    // Query to get total paid orders for official products
    const paidSql = `
      SELECT COUNT(*) as total_paid
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      JOIN products p ON ti.product_id = p.id
      WHERE p.is_official = 1
      AND t.payment_status = 'paid'
    `;
    
    // Query to get total pending orders for official products
    const pendingSql = `
      SELECT COUNT(*) as total_pending
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      JOIN products p ON ti.product_id = p.id
      WHERE p.is_official = 1
      AND t.payment_status = 'pending'
    `;
    
    const [paidResults] = await Product.query(paidSql);
    const [pendingResults] = await Product.query(pendingSql);
    
    const totalPaid = paidResults.total_paid || 0;
    const totalPending = pendingResults.total_pending || 0;
    
    console.log(`📊 Statistik produk official: ${totalPaid} paid, ${totalPending} pending`);
    
    return res.status(200).json({
      success: true,
      total_paid: totalPaid,
      total_pending: totalPending
    });
  } catch (error) {
    console.error('❌ Error saat mengambil statistik produk official:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  searchProducts,
  getProductReviews,
  getOfficialProductsStats
}; 
