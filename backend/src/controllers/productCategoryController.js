const { ProductCategory } = require('../models');

/**
 * Get all product categories
 */
const getAllCategories = async (req, res) => {
  try {
    const categories = await ProductCategory.findAll({
      where: { is_active: true },
      orderBy: 'name',
      order: 'ASC'
    });
    
    console.log(`📦 Mengambil ${categories.length} kategori produk`);
    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('❌ Error saat mengambil kategori produk:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get product category by ID
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await ProductCategory.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori produk tidak ditemukan'
      });
    }
    
    console.log(`📦 Mengambil kategori produk dengan ID: ${id}`);
    return res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error(`❌ Error saat mengambil kategori produk ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get products by category ID
 */
const getProductsByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { Product } = require('../models'); // Dynamic import to avoid circular dependency
    
    // Check if category exists
    const category = await ProductCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori produk tidak ditemukan'
      });
    }
    
    // Get products by category with SQL query
    const sql = `
      SELECT p.*, '${category.name}' as category_name
      FROM products p
      WHERE p.category_id = ? 
      AND p.is_active = 1 
      AND p.is_verified = 1
      ORDER BY p.name ASC
    `;
    
    const products = await Product.query(sql, [id]);
    
    console.log(`📦 Mengambil ${products.length} produk dari kategori ID: ${id}`);
    return res.status(200).json({
      success: true,
      data: {
        category,
        products
      }
    });
  } catch (error) {
    console.error(`❌ Error saat mengambil produk dari kategori ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  getProductsByCategory
}; 