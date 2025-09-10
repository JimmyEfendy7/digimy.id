const { pool } = require('../config/database');
const crypto = require('crypto');

// Get all embed codes for a store
const getStoreEmbedCodes = async (req, res) => {
  let connection;
  
  try {
    const { storeId } = req.params;
    console.log('[DEBUG] getStoreEmbedCodes called with storeId:', storeId);
    
    connection = await pool.getConnection();
    
    // Get embed codes with product information including promo fields (only existing DB fields)
    const [embedCodes] = await connection.execute(`
      SELECT 
        ec.id,
        ec.embed_code,
        ec.title,
        ec.is_active,
        ec.form_config,
        ec.created_at,
        ec.updated_at,
        p.id as product_id,
        p.name as product_name,
        p.poster_url as product_image,
        p.price as product_price,
        p.promo_price
      FROM embed_codes ec
      INNER JOIN products p ON ec.product_id = p.id
      WHERE ec.store_id = ?
      ORDER BY ec.created_at DESC
    `, [storeId]);

    // Get form fields for each embed code
    for (let embedCode of embedCodes) {
      const [fields] = await connection.execute(`
        SELECT 
          field_name,
          field_label,
          field_type,
          field_options,
          is_required,
          field_order
        FROM embed_form_fields
        WHERE embed_code_id = ?
        ORDER BY field_order ASC
      `, [embedCode.id]);
      
      embedCode.custom_fields = fields;
    }

    res.json({
      success: true,
      data: embedCodes
    });

  } catch (error) {
    console.error('Error fetching store embed codes:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data embed code',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Create new embed code
const createEmbedCode = async (req, res) => {
  let connection;
  
  try {
    const { storeId } = req.params;
    const { product_id, title, custom_fields = [] } = req.body;
    
    console.log('[DEBUG] createEmbedCode called:', { storeId, product_id, title });

    if (!product_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'Product ID dan title wajib diisi'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Generate unique embed code
      const embedCode = crypto.randomBytes(16).toString('hex');
      
      // Create basic form config (always includes name and whatsapp)
      const formConfig = {
        required_fields: ['customer_name', 'customer_phone'],
        custom_fields: custom_fields.length
      };

      // Insert embed code
      const [embedResult] = await connection.execute(`
        INSERT INTO embed_codes 
        (store_id, product_id, embed_code, title, form_config, is_active)
        VALUES (?, ?, ?, ?, ?, TRUE)
      `, [storeId, product_id, embedCode, title, JSON.stringify(formConfig)]);

      const embedCodeId = embedResult.insertId;

      // Insert custom form fields
      for (const [index, field] of custom_fields.entries()) {
        await connection.execute(`
          INSERT INTO embed_form_fields
          (embed_code_id, field_name, field_label, field_type, field_options, is_required, field_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          embedCodeId,
          field.field_name,
          field.field_label,
          field.field_type,
          field.field_options ? JSON.stringify(field.field_options) : null,
          field.is_required || false,
          index
        ]);
      }

      await connection.commit();
      console.log('[DEBUG] createEmbedCode - Transaction committed, embedCodeId:', embedCodeId);

      // Return the created embed code data with promo fields (only existing DB fields)
      console.log('[DEBUG] createEmbedCode - Fetching new embed code data...');
      const [newEmbedCode] = await connection.execute(`
        SELECT 
          ec.*,
          p.name as product_name,
          p.poster_url as product_image,
          p.price as product_price,
          p.promo_price
        FROM embed_codes ec
        INNER JOIN products p ON ec.product_id = p.id
        WHERE ec.id = ?
      `, [embedCodeId]);
      
      console.log('[DEBUG] createEmbedCode - Query result:', {
        found: newEmbedCode.length > 0,
        embedCodeId: embedCodeId,
        productName: newEmbedCode[0]?.product_name,
        hasPromoPrice: !!newEmbedCode[0]?.promo_price
      });

      res.json({
        success: true,
        data: {
          ...newEmbedCode[0],
          custom_fields: custom_fields
        },
        message: 'Embed code berhasil dibuat'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error creating embed code:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat embed code',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Update embed code
const updateEmbedCode = async (req, res) => {
  let connection;
  
  try {
    const { storeId, embedCodeId } = req.params;
    const { title, custom_fields = [], is_active } = req.body;
    
    console.log('[DEBUG] updateEmbedCode called:', { storeId, embedCodeId, title, is_active });

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check if embed code belongs to store
      const [embedCheck] = await connection.execute(`
        SELECT id FROM embed_codes 
        WHERE id = ? AND store_id = ?
      `, [embedCodeId, storeId]);

      if (embedCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Embed code tidak ditemukan'
        });
      }

      // Update embed code
      const formConfig = {
        required_fields: ['customer_name', 'customer_phone'],
        custom_fields: custom_fields.length
      };

      await connection.execute(`
        UPDATE embed_codes 
        SET title = ?, form_config = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND store_id = ?
      `, [title, JSON.stringify(formConfig), is_active, embedCodeId, storeId]);

      // Delete existing custom fields
      await connection.execute(`
        DELETE FROM embed_form_fields WHERE embed_code_id = ?
      `, [embedCodeId]);

      // Insert updated custom fields
      for (const [index, field] of custom_fields.entries()) {
        await connection.execute(`
          INSERT INTO embed_form_fields
          (embed_code_id, field_name, field_label, field_type, field_options, is_required, field_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          embedCodeId,
          field.field_name,
          field.field_label,
          field.field_type,
          field.field_options ? JSON.stringify(field.field_options) : null,
          field.is_required || false,
          index
        ]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Embed code berhasil diupdate'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error updating embed code:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate embed code',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Delete embed code
const deleteEmbedCode = async (req, res) => {
  let connection;
  
  try {
    const { storeId, embedCodeId } = req.params;
    
    connection = await pool.getConnection();

    // Check if embed code belongs to store
    const [embedCheck] = await connection.execute(`
      SELECT id FROM embed_codes 
      WHERE id = ? AND store_id = ?
    `, [embedCodeId, storeId]);

    if (embedCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Embed code tidak ditemukan'
      });
    }

    // Delete embed code (cascade will delete related records)
    await connection.execute(`
      DELETE FROM embed_codes WHERE id = ? AND store_id = ?
    `, [embedCodeId, storeId]);

    res.json({
      success: true,
      message: 'Embed code berhasil dihapus'
    });

  } catch (error) {
    console.error('Error deleting embed code:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus embed code',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Toggle embed code active status
const toggleEmbedCodeStatus = async (req, res) => {
  let connection;
  
  try {
    const { storeId, embedCodeId } = req.params;
    const { is_active } = req.body;
    
    console.log('[DEBUG] toggleEmbedCodeStatus called:', { 
      storeId, 
      embedCodeId, 
      is_active, 
      requestBody: req.body,
      timestamp: new Date().toISOString()
    });
    
    connection = await pool.getConnection();

    // Check if embed code belongs to store
    const [embedCheck] = await connection.execute(`
      SELECT id FROM embed_codes 
      WHERE id = ? AND store_id = ?
    `, [embedCodeId, storeId]);

    if (embedCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Embed code tidak ditemukan'
      });
    }

    // Toggle status
    await connection.execute(`
      UPDATE embed_codes 
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND store_id = ?
    `, [is_active, embedCodeId, storeId]);

    res.json({
      success: true,
      message: `Embed code berhasil ${is_active ? 'diaktifkan' : 'dinonaktifkan'}`
    });

  } catch (error) {
    console.error('Error toggling embed code status:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengubah status embed code',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Get embed code for public usage (without store authentication)
const getPublicEmbedCode = async (req, res) => {
  let connection;
  
  try {
    const { embedCode } = req.params;
    
    connection = await pool.getConnection();

    // Get embed code data with product details, category, and store verification
    const [embedData] = await connection.execute(`
      SELECT 
        ec.id,
        ec.embed_code,
        ec.title,
        ec.is_active,
        ec.product_id,
        p.name as product_name,
        p.description as product_description,
        p.poster_url as product_image,
        p.price as product_price,
        p.promo_price,
        p.stock as product_stock,
        pc.name as category_name,
        ec.store_id,
        s.name as store_name,
        s.logo as store_logo,
        s.is_verified as store_verified,
        ec.form_config
      FROM embed_codes ec
      INNER JOIN products p ON ec.product_id = p.id
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      INNER JOIN stores s ON ec.store_id = s.id
      WHERE ec.embed_code = ? AND ec.is_active = TRUE
    `, [embedCode]);

    if (embedData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Embed code tidak ditemukan atau tidak aktif'
      });
    }

    const embed = embedData[0];

    // Get product reviews
    const [reviewsData] = await connection.execute(`
      SELECT id, file_url, file_type
      FROM product_reviews
      WHERE product_id = ?
      ORDER BY created_at DESC
    `, [embed.product_id]);

    // Add reviews to embed data
    embed.product_reviews = reviewsData;

    // Get custom form fields
    const [fields] = await connection.execute(`
      SELECT 
        field_name,
        field_label,
        field_type,
        field_options,
        is_required,
        field_order
      FROM embed_form_fields
      WHERE embed_code_id = ?
      ORDER BY field_order ASC
    `, [embedData[0].id]);

    res.json({
      success: true,
      data: {
        ...embedData[0],
        custom_fields: fields
      }
    });

  } catch (error) {
    console.error('Error fetching public embed code:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data embed code',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Process embed code purchase
const processEmbedPurchase = async (req, res) => {
  let connection;
  
  try {
    const { embedCode } = req.params;
    const { form_data, customer_name, customer_phone, order_id, amount } = req.body;
    
    console.log('[DEBUG] processEmbedPurchase called:', { embedCode, customer_name, order_id, amount });

    if (!customer_name || !customer_phone) {
      return res.status(400).json({
        success: false,
        message: 'Nama dan nomor WhatsApp wajib diisi'
      });
    }

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID wajib diisi'
      });
    }

    connection = await pool.getConnection();

    // Get embed code data with promo price fields (only existing DB fields)
    const [embedData] = await connection.execute(`
      SELECT 
        ec.id,
        ec.store_id,
        p.id as product_id,
        p.name as product_name,
        p.price as product_price,
        p.promo_price
      FROM embed_codes ec
      INNER JOIN products p ON ec.product_id = p.id
      WHERE ec.embed_code = ? AND ec.is_active = TRUE
    `, [embedCode]);

    if (embedData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Embed code tidak ditemukan atau tidak aktif'
      });
    }

    const embed = embedData[0];

    // Calculate effective price (promo price if active, otherwise regular price)
    const isPromoActive = (data) => {
      // Simplified: if promo price exists and is greater than 0, consider it active
      return !!(data.promo_price && data.promo_price > 0);
    };

    const effectivePrice = isPromoActive(embed) && embed.promo_price ? embed.promo_price : embed.product_price;
    
    console.log('[DEBUG] processEmbedPurchase price calculation:', {
      product_price: embed.product_price,
      promo_price: embed.promo_price,
      promo_active: isPromoActive(embed),
      effective_price: effectivePrice
    });

    // Check if transaction already exists (created by Midtrans Snap token generation)
    const [existingTransaction] = await connection.execute(`
      SELECT id, transaction_code, payment_status, total_amount
      FROM transactions 
      WHERE transaction_code = ?
    `, [order_id]);

    if (existingTransaction.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi tidak ditemukan'
      });
    }

    const transaction = existingTransaction[0];
    const transactionId = transaction.id;

    // Verify transaction is pending before proceeding
    if (transaction.payment_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Transaksi sudah diproses sebelumnya'
      });
    }

    // Mark the transaction source as 'embed' so it is correctly identified in dashboards
    try {
      await connection.execute(`
        UPDATE transactions
        SET source = 'embed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND (source IS NULL OR source = '' OR source <> 'embed')
      `, [transactionId]);
    } catch (e) {
      console.warn('[WARN] Failed to update transaction source to embed:', e.message);
    }

    // Create transaction item with final amount if not exists
    const [existingTransactionItem] = await connection.execute(`
      SELECT id FROM transaction_items
      WHERE transaction_id = ? AND product_id = ?
    `, [transactionId, embed.product_id]);

    if (existingTransactionItem.length === 0) {
      await connection.execute(`
        INSERT INTO transaction_items
        (transaction_id, product_id, store_id, item_name, item_price, quantity, subtotal, status)
        VALUES (?, ?, ?, ?, ?, 1, ?, 'pending')
      `, [transactionId, embed.product_id, embed.store_id, embed.product_name, effectivePrice, effectivePrice]);
    }

    // Store embed transaction with custom form data
    await connection.execute(`
      INSERT INTO embed_transactions
      (embed_code_id, transaction_id, form_data)
      VALUES (?, ?, ?)
    `, [embed.id, transactionId, JSON.stringify(form_data || {})]);

    console.log('[DEBUG] Embed transaction data added to existing transaction:', {
      transaction_id: transactionId,
      transaction_code: order_id,
      amount: transaction.total_amount,
      source: 'embed'
    });

    res.json({
      success: true,
      data: {
        transaction_id: transactionId,
        transaction_code: order_id,
        order_id: order_id,
        amount: transaction.total_amount,
        original_price: embed.product_price,
        promo_applied: isPromoActive(embed) && embed.promo_price ? true : false,
        product_name: embed.product_name,
        store_name: embed.store_name || 'Unknown Store'
      },
      message: 'Transaksi embed berhasil diproses'
    });

  } catch (error) {
    console.error('Error processing embed purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memproses pembelian',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getStoreEmbedCodes,
  createEmbedCode,
  updateEmbedCode,
  deleteEmbedCode,
  toggleEmbedCodeStatus,
  getPublicEmbedCode,
  processEmbedPurchase
};
