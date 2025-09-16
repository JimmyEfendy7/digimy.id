const { ServiceCategory, ServiceSubcategory, Service, ServiceAddon } = require('../models');

/**
 * Get all service categories
 */
const getAllServiceCategories = async (req, res) => {
  try {
    const categories = await ServiceCategory.findAll({
      where: { is_active: true },
      orderBy: 'name',
      order: 'ASC'
    });
    
    console.log(`📦 Mengambil ${categories.length} kategori layanan`);
    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('❌ Error saat mengambil kategori layanan:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get all services with pagination
 */
const getAllServices = async (req, res) => {
  try {
    const { limit = 12, page = 1, category_id } = req.query;
    const offset = (page - 1) * limit;
    
    // Prepare base query
    let whereClause = { 
      is_active: true,
      is_verified: true
    };
    
    // Add category filter if provided
    if (category_id) {
      // First get subcategories for this category
      const subcategories = await ServiceSubcategory.findAll({
        where: { category_id }
      });
      
      // Get subcategory IDs
      const subcategoryIds = subcategories.map(sub => sub.id);
      
      // Add to where clause - skip if no subcategories found
      if (subcategoryIds.length > 0) {
        // For MySQL, we'll handle this in the model or use raw query
        // For now, let's use the first subcategory as fallback
        whereClause.subcategory_id = subcategoryIds[0];
      }
    }
    
    // Get total count for pagination
    const total = await Service.count({ where: whereClause });
    
    // Get services with pagination
    const services = await Service.findAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      orderBy: 'created_at',
      order: 'DESC'
    });
    
    console.log(`📦 Mengambil ${services.length} layanan dengan pagination (page: ${page}, limit: ${limit})`);
    return res.status(200).json({
      success: true,
      data: services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error saat mengambil semua layanan:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get popular services 
 */
const getPopularServices = async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const limitNum = parseInt(limit);
    
    // Karena model kita tidak mendukung pengurutan dengan multiple fields via ORM
    // kita akan menggunakan query langsung
    const sql = `
      SELECT * FROM services 
      WHERE is_active = 1 AND is_verified = 1
      ORDER BY rating DESC, review_count DESC, created_at DESC
      LIMIT ?
    `;
    
    console.log(`📑 SQL untuk popular services: ${sql}`);
    
    let services = [];
    try {
      services = await Service.query(sql, [limitNum]);
    } catch (queryError) {
      console.error('❌ Error pada query:', queryError);
      
      // Mendapatkan daftar service menggunakan findAll sebagai fallback
      console.log('⚠️ Mencoba fallback dengan findAll...');
      services = await Service.findAll({
        where: { is_active: true, is_verified: true },
        limit: limitNum
      });
    }
    
    // No dummy data - return empty array if no services found
    if (!services) {
      services = [];
    }
    
    console.log(`📦 Mengambil ${services.length} layanan terpopuler`);
    return res.status(200).json({
      success: true,
      data: services,
      pagination: {
        limit: limitNum,
        total: services.length
      }
    });
  } catch (error) {
    console.error('❌ Error saat mengambil layanan terpopuler:', error);
    console.error('❌ Error detail:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Return error response instead of dummy data
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat mengambil layanan',
      data: [],
      pagination: {
        limit: 8,
        total: 0
      },
      error_info: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error'
    });
  }
};

/**
 * Get subcategories by service category ID
 */
const getSubcategoriesByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category exists
    const category = await ServiceCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori layanan tidak ditemukan'
      });
    }
    
    // Get subcategories
    const subcategories = await ServiceSubcategory.findAll({
      where: { 
        category_id: id,
        is_active: true
      },
      orderBy: 'name',
      order: 'ASC'
    });
    
    console.log(`📦 Mengambil ${subcategories.length} subkategori dari kategori ID: ${id}`);
    return res.status(200).json({
      success: true,
      data: {
        category,
        subcategories
      }
    });
  } catch (error) {
    console.error(`❌ Error saat mengambil subkategori dari kategori ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get services by subcategory ID
 */
const getServicesBySubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if subcategory exists
    const subcategory = await ServiceSubcategory.findById(id);
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subkategori layanan tidak ditemukan'
      });
    }
    
    // Get category
    const category = await ServiceCategory.findById(subcategory.category_id);
    
    // Get services
    const services = await Service.findAll({
      where: { 
        subcategory_id: id,
        is_active: true,
        is_verified: true
      },
      orderBy: 'price',
      order: 'ASC'
    });
    
    // Get addons for this subcategory
    const addons = await ServiceAddon.findAll({
      where: {
        subcategory_id: id,
        is_active: true
      }
    });
    
    console.log(`📦 Mengambil ${services.length} layanan dan ${addons.length} addon dari subkategori ID: ${id}`);
    return res.status(200).json({
      success: true,
      data: {
        category,
        subcategory,
        services,
        addons
      }
    });
  } catch (error) {
    console.error(`❌ Error saat mengambil layanan dari subkategori ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get service by ID
 */
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Layanan tidak ditemukan'
      });
    }
    
    // Get subcategory and category
    const subcategory = await ServiceSubcategory.findById(service.subcategory_id);
    const category = await ServiceCategory.findById(subcategory.category_id);
    
    // Get store (if exists)
    let store = null;
    if (service.store_id) {
      const { Store } = require('../models');
      store = await Store.findById(service.store_id);
    }
    
    // Get testimonials
    const { Testimonial } = require('../models');
    const testimonials = await Testimonial.findAll({
      where: {
        service_id: id,
        is_approved: true
      }
    });
    
    // Get addons for this service
    const addons = await ServiceAddon.findAll({
      where: {
        subcategory_id: service.subcategory_id,
        is_active: true
      }
    });
    
    console.log(`📦 Mengambil layanan dengan ID: ${id}`);
    return res.status(200).json({
      success: true,
      data: {
        service,
        subcategory,
        category,
        store,
        testimonials,
        addons
      }
    });
  } catch (error) {
    console.error(`❌ Error saat mengambil layanan ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Search services
 */
const searchServices = async (req, res) => {
  try {
    const { keyword, limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'Kata kunci pencarian diperlukan'
      });
    }
    
    // Custom SQL query for search
    const sql = `
      SELECT * FROM services 
      WHERE (name LIKE ? OR description LIKE ?) 
      AND is_active = 1 AND is_verified = 1
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    // Run the search query with parameter binding
    const searchTerm = `%${keyword}%`;
    const values = [searchTerm, searchTerm, parseInt(limit), parseInt(offset)];
    
    const services = await Service.query(sql, values);
    
    console.log(`🔍 Mencari layanan dengan kata kunci "${keyword}" - menemukan ${services.length} hasil`);
    return res.status(200).json({
      success: true,
      data: services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ Error saat mencari layanan:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getAllServiceCategories,
  getSubcategoriesByCategory,
  getServicesBySubcategory,
  getServiceById,
  searchServices,
  getAllServices,
  getPopularServices
}; 
