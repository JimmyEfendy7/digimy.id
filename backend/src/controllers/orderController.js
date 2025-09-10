const { pool } = require('../config/database');

// Get orders for a specific store
const getStoreOrders = async (req, res) => {
  console.log('[DEBUG] getStoreOrders called with storeId:', req.params.storeId);
  
  let connection;
  
  try {
    console.log('[DEBUG] Attempting to get database connection...');
    connection = await pool.getConnection();
    console.log('[DEBUG] Database connection successful');
    
    const { storeId } = req.params;
    const { page = 1, limit = 10, status = 'all', search = '', date = '' } = req.query;
    const offset = (page - 1) * limit;

    // Base query to get orders for the store
    let whereClause = 'WHERE ti.store_id = ?';
    let queryParams = [storeId];

    if (status !== 'all') {
      // Allow filtering for both 'cancel' and legacy 'canceled'
      if (status === 'cancel' || status === 'canceled') {
        whereClause += " AND ti.status IN ('cancel','canceled')";
      } else {
        whereClause += ' AND ti.status = ?';
        queryParams.push(status);
      }
    }

    // Add WhatsApp search functionality
    if (search && search.trim() !== '') {
      whereClause += ' AND t.customer_phone LIKE ?';
      queryParams.push(`%${search.trim()}%`);
    }

    // Add date filter functionality
    if (date && date.trim() !== '') {
      whereClause += ' AND DATE(t.created_at) = ?';
      queryParams.push(date.trim());
    }

    // Get orders with transaction details including source and embed custom form data
    const [orders] = await connection.execute(`
      SELECT 
        t.id as transaction_id,
        t.transaction_code,
        t.customer_name,
        t.customer_phone,
        t.customer_email,
        t.total_amount,
        t.payment_status as transaction_status,
        t.payment_method,
        t.payment_status,
        t.source,
        t.created_at as order_date,
        ti.id as item_id,
        ti.item_name,
        ti.item_price,
        ti.quantity,
        ti.subtotal,
        ti.status as item_status,
        p.id as product_id,
        p.poster_url as product_image,
        et.form_data as embed_form_data
      FROM transactions t
      INNER JOIN transaction_items ti ON t.id = ti.transaction_id
      LEFT JOIN products p ON ti.product_id = p.id
      LEFT JOIN embed_transactions et ON t.id = et.transaction_id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    // Get total count for pagination
    const [countResult] = await connection.execute(`
      SELECT COUNT(DISTINCT t.id) as total
      FROM transactions t
      INNER JOIN transaction_items ti ON t.id = ti.transaction_id
      ${whereClause}
    `, queryParams);

    const totalOrders = countResult[0].total;
    const totalPages = Math.ceil(totalOrders / limit);

    // Group orders by transaction using a Map to PRESERVE SQL order (DESC)
    // Using a plain object with numeric keys can reorder entries ascending by key.
    const groupedOrdersMap = orders.reduce((acc, order) => {
      const transactionId = order.transaction_id;

      if (!acc.has(transactionId)) {
        // Parse embed form data if available
        let embedFormData = null;
        if (order.embed_form_data) {
          try {
            embedFormData = JSON.parse(order.embed_form_data);
          } catch (e) {
            console.error('Error parsing embed form data:', e);
            embedFormData = null;
          }
        }

        acc.set(transactionId, {
          transaction_id: order.transaction_id,
          transaction_code: order.transaction_code,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          customer_email: order.customer_email,
          total_amount: order.total_amount,
          transaction_status: order.transaction_status,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          source: order.source, // Now includes source information
          embed_form_data: embedFormData, // Include parsed custom form data
          order_date: order.order_date,
          items: []
        });
      }

      const entry = acc.get(transactionId);
      entry.items.push({
        item_id: order.item_id,
        product_id: order.product_id,
        item_name: order.item_name,
        item_price: order.item_price,
        quantity: order.quantity,
        subtotal: order.subtotal,
        // Normalize legacy value to keep API consistent
        item_status: order.item_status === 'canceled' ? 'cancel' : order.item_status,
        product_image: order.product_image
      });

      return acc;
    }, new Map());

    const formattedOrders = Array.from(groupedOrdersMap.values());

    res.json({
      success: true,
      data: {
        orders: formattedOrders,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_orders: totalOrders,
          per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching store orders:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pesanan',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Refund a canceled order item and adjust store balance
const refundOrderItem = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { storeId, itemId } = req.params;

    // Fetch item, transaction, and store info
    const [rows] = await connection.execute(`
      SELECT 
        ti.id as item_id,
        ti.subtotal,
        ti.status as item_status,
        ti.store_id,
        t.id as transaction_id,
        t.payment_status,
        s.id as store_id_db,
        s.balance
      FROM transaction_items ti
      INNER JOIN transactions t ON t.id = ti.transaction_id
      INNER JOIN stores s ON s.id = ti.store_id
      WHERE ti.id = ? AND ti.store_id = ?
    `, [itemId, storeId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item pesanan tidak ditemukan' });
    }

    const item = rows[0];
    const isCanceled = item.item_status === 'cancel' || item.item_status === 'canceled';
    if (!isCanceled) {
      return res.status(400).json({ success: false, message: 'Refund hanya bisa dilakukan untuk item yang dibatalkan' });
    }

    if (item.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Refund hanya bisa dilakukan jika status pembayaran "dibayar"' });
    }

    // Start DB transaction
    await connection.beginTransaction();

    // Update transaction payment status to refunded (once per transaction)
    await connection.execute(`
      UPDATE transactions SET payment_status = 'refunded', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND payment_status <> 'refunded'
    `, [item.transaction_id]);

    // Deduct balance ONLY if the item had already been credited (completed)
    const wasCompleted = item.item_status === 'completed';
    if (wasCompleted) {
      await connection.execute(`
        UPDATE stores SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [item.subtotal, item.store_id_db]);
    }

    await connection.commit();

    return res.json({ success: true, message: 'Refund berhasil diproses', data: { transaction_id: item.transaction_id, refunded_amount: item.subtotal } });
  } catch (error) {
    try { await connection.rollback(); } catch (e) {}
    console.error('Error processing refund:', error);
    return res.status(500).json({ success: false, message: 'Gagal memproses refund' });
  } finally {
    connection.release();
  }
};

// Update order item status
const updateOrderItemStatus = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { storeId, itemId } = req.params;
    let { status } = req.body;
    const rawStatus = String(status || '').trim().toLowerCase();
    // Map various cancel words to logical 'cancel'
    const cancelAliases = new Set(['cancel', 'canceled', 'cancelled', 'batal', 'dibatalkan']);
    let logicalStatus = rawStatus;
    if (cancelAliases.has(rawStatus)) logicalStatus = 'cancel';
    // Validate normalized status
    const validStatuses = new Set(['pending', 'processing', 'completed', 'cancel']);
    if (!validStatuses.has(logicalStatus)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }

    // Check if the item belongs to the store and fetch current state
    const [itemCheck] = await connection.execute(`
      SELECT 
        ti.id,
        ti.status as current_status,
        ti.subtotal,
        ti.store_id,
        ti.product_id,
        ti.quantity,
        t.payment_status,
        s.id AS store_id_db
      FROM transaction_items ti
      INNER JOIN transactions t ON t.id = ti.transaction_id
      INNER JOIN stores s ON s.id = ti.store_id
      WHERE ti.id = ? AND ti.store_id = ?
    `, [itemId, storeId]);

    if (itemCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item pesanan tidak ditemukan'
      });
    }
    const itemRow = itemCheck[0];

    // Update the item status
    // For cancel, try multiple variants to match DB ENUM spelling; prefer 'canceled' (ENUM uses one L)
    const tryStatuses = logicalStatus === 'cancel' 
      ? ['canceled', 'cancel', 'cancelled'] 
      : [logicalStatus];
    let updated = false;
    let lastError = null;
    for (const st of tryStatuses) {
      try {
        await connection.execute(`
          UPDATE transaction_items 
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND store_id = ?
        `, [st, itemId, storeId]);
        updated = true;
        break;
      } catch (e) {
        lastError = e;
      }
    }
    if (!updated) {
      throw lastError || new Error('Failed to update status');
    }

    // Re-fetch and validate stored status to guard against ENUM coercion to '' or NULL
    const [verifyRows] = await connection.execute(`
      SELECT status AS new_status FROM transaction_items WHERE id = ? AND store_id = ?
    `, [itemId, storeId]);
    const newStatus = verifyRows && verifyRows[0] ? (verifyRows[0].new_status || '').toLowerCase() : '';
    const allowedDbStatuses = new Set(['pending', 'processing', 'completed', 'cancel', 'canceled', 'cancelled']);
    if (!allowedDbStatuses.has(newStatus)) {
      // Force to a safe value 'canceled' to align with DB ENUM and UI label "Dibatalkan"
      await connection.execute(`
        UPDATE transaction_items SET status = 'canceled', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND store_id = ?
      `, [itemId, storeId]);
    }

    // If transitioning to completed for the first time and transaction is paid, credit store balance
    if (logicalStatus === 'completed' && itemRow.current_status !== 'completed' && itemRow.payment_status === 'paid') {
      // Credit store balance for this completed item
      await connection.execute(`
        UPDATE stores
        SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [itemRow.subtotal, itemRow.store_id_db]);

      // Decrement product stock if this item is a product
      if (itemRow.product_id) {
        await connection.execute(`
          UPDATE products
          SET stock = GREATEST(stock - ?, 0), updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [itemRow.quantity || 1, itemRow.product_id]);
      }
    }

    res.json({
      success: true,
      message: 'Status pesanan berhasil diupdate'
    });

  } catch (error) {
    console.error('Error updating order item status:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate status pesanan'
    });
  } finally {
    connection.release();
  }
};

// Get order statistics for dashboard
const getOrderStats = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { storeId } = req.params;

    // Get order statistics
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(DISTINCT t.id) as total_orders,
        COUNT(CASE WHEN ti.status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN ti.status = 'processing' THEN 1 END) as processing_orders,
        COUNT(CASE WHEN ti.status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN ti.status IN ('cancel','canceled','cancelled') THEN 1 END) as canceled_orders,
        COALESCE(SUM(CASE WHEN t.payment_status = 'paid' AND ti.status = 'completed' THEN ti.subtotal END), 0) as total_revenue
      FROM transactions t
      INNER JOIN transaction_items ti ON t.id = ti.transaction_id
      WHERE ti.store_id = ?
    `, [storeId]);

    // Get monthly revenue for the last 12 months
    const [monthlyRevenue] = await connection.execute(`
      SELECT 
        DATE_FORMAT(t.created_at, '%Y-%m') as month,
        COALESCE(SUM(ti.subtotal), 0) as revenue
      FROM transactions t
      INNER JOIN transaction_items ti ON t.id = ti.transaction_id
      WHERE ti.store_id = ? 
        AND t.payment_status = 'paid'
        AND ti.status = 'completed'
        AND t.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(t.created_at, '%Y-%m')
      ORDER BY month DESC
    `, [storeId]);

    res.json({
      success: true,
      data: {
        stats: stats[0],
        monthly_revenue: monthlyRevenue
      }
    });

  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil statistik pesanan'
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getStoreOrders,
  updateOrderItemStatus,
  getOrderStats,
  refundOrderItem
};
