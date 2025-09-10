const { Store } = require('../models');

/**
 * Get store details by ID
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getStoreById = async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log(`[INFO] Fetching store with ID: ${id}`);
    
    // Mengambil detail toko menggunakan model Store
    const storeData = await Store.findById(id);
    
    if (!storeData) {
      console.log(`[WARN] Store with ID ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }
    
    // Only show verified stores to customers
    if (!storeData.is_verified) {
      console.log(`[WARN] Store with ID ${id} is not verified`);
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }
    
    // Mengambil jumlah produk toko menggunakan model Store
    const productCount = await Store.query(
      'SELECT COUNT(*) as count FROM products WHERE store_id = ?',
      [id]
    );
    
    // Format response sesuai struktur kolom di tabel stores
    const responseData = {
      id: storeData.id,
      name: storeData.name,
      slug: storeData.slug,
      description: storeData.description,
      logo: storeData.logo,
      banner: storeData.banner,
      phone_number: storeData.phone_number,
      email: storeData.email,
      address: storeData.address,
      is_verified: storeData.is_verified,
      is_active: storeData.is_active,
      created_at: storeData.created_at,
      updated_at: storeData.updated_at,
      product_count: productCount[0].count
    };
    
    // Return response
    return res.status(200).json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    console.error(`[ERROR] Error fetching store: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching store details',
      error: error.message
    });
  }
};

/**
 * Get store stats (total paid orders and pending orders)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getStoreStats = async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log(`[INFO] Fetching stats for store with ID: ${id}`);
    
    // Verify store exists
    const store = await Store.findById(id);
    if (!store) {
      console.log(`[WARN] Store with ID ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }
    
    // Query to get total paid orders for this store
    const paidSql = `
      SELECT COUNT(*) as total_paid
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE ti.store_id = ?
      AND t.payment_status = 'paid'
    `;
    
    // Query to get total pending orders for this store
    const pendingSql = `
      SELECT COUNT(*) as total_pending
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE ti.store_id = ?
      AND t.payment_status = 'pending'
    `;
    
    const [paidResults] = await Store.query(paidSql, [id]);
    const [pendingResults] = await Store.query(pendingSql, [id]);
    
    const totalPaid = paidResults.total_paid || 0;
    const totalPending = pendingResults.total_pending || 0;
    
    console.log(`📊 Store stats for ID ${id}: ${totalPaid} paid, ${totalPending} pending`);
    
    return res.status(200).json({
      success: true,
      total_paid: totalPaid,
      total_pending: totalPending
    });
    
  } catch (error) {
    console.error(`[ERROR] Error fetching store stats: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching store stats',
      error: error.message
    });
  }
};

/**
 * Get similar products from other stores in the same categories
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getSimilarProducts = async (req, res) => {
  const { id } = req.params;
  const { limit = 8 } = req.query;
  
  try {
    console.log(`[INFO] Fetching similar products for store with ID: ${id}`);
    
    // Verify store exists
    const store = await Store.findById(id);
    if (!store) {
      console.log(`[WARN] Store with ID ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }
    
    // First get categories of products this store sells
    const storeProductCategoriesSql = `
      SELECT DISTINCT category_id 
      FROM products 
      WHERE store_id = ?
    `;
    
    const categories = await Store.query(storeProductCategoriesSql, [id]);
    
    if (!categories.length) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    
    // Get category IDs as array
    const categoryIds = categories.map(cat => cat.category_id);
    const categoryIdsStr = categoryIds.join(',');
    
    // Get products from other stores in the same categories
    const similarProductsSql = `
      SELECT p.*, pc.name as category_name, s.name as store_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE p.category_id IN (${categoryIdsStr})
      AND p.store_id != ? 
      AND p.store_id IS NOT NULL
      AND p.is_active = 1 
      AND p.is_verified = 1
      AND s.is_verified = 1
      ORDER BY RAND()
      LIMIT ?
    `;
    
    const similarProducts = await Store.query(similarProductsSql, [id, parseInt(limit)]);
    
    console.log(`🔍 Found ${similarProducts.length} similar products for store ID: ${id}`);
    
    return res.status(200).json({
      success: true,
      data: similarProducts
    });
    
  } catch (error) {
    console.error(`[ERROR] Error fetching similar products: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching similar products',
      error: error.message
    });
  }
};

/**
 * Get all products for a specific store
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getStoreProducts = async (req, res) => {
  const { id } = req.params;
  const { limit = 12, page = 1 } = req.query;
  
  try {
    console.log(`[INFO] Fetching products for store with ID: ${id}, page: ${page}, limit: ${limit}`);
    
    // Verify store exists and is verified
    const store = await Store.findById(id);
    if (!store) {
      console.log(`[WARN] Store with ID ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }
    
    // Only show products from verified stores to customers
    if (!store.is_verified) {
      console.log(`[WARN] Store with ID ${id} is not verified`);
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }
    
    // Get all products for this store with pagination
    const offset = (page - 1) * limit;
    
    const productsSql = `
      SELECT p.*, pc.name as category_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      WHERE p.store_id = ?
      AND p.is_active = 1
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const products = await Store.query(productsSql, [id, parseInt(limit), parseInt(offset)]);
    
    // Get total count for pagination
    const countSql = `
      SELECT COUNT(*) as total
      FROM products
      WHERE store_id = ?
      AND is_active = 1
    `;
    
    const [countResult] = await Store.query(countSql, [id]);
    const totalProducts = countResult.total || 0;
    const totalPages = Math.ceil(totalProducts / limit);
    
    console.log(`📦 Found ${products.length} products for store ID: ${id} (Total: ${totalProducts})`);
    
    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalProducts,
        totalPages: totalPages
      }
    });
    
  } catch (error) {
    console.error(`[ERROR] Error fetching store products: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching store products',
      error: error.message
    });
  }
};

module.exports = {
  getStoreById,
  getStoreStats,
  getSimilarProducts,
  getStoreProducts
}; 