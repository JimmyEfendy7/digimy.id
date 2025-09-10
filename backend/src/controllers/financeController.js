const { pool } = require('../config/database');

// Get store balance and financial summary
const getStoreFinance = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { storeId } = req.params;

    // Get store balance
    const [storeBalance] = await connection.execute(`
      SELECT balance 
      FROM stores 
      WHERE id = ?
    `, [storeId]);

    if (storeBalance.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Toko tidak ditemukan'
      });
    }

    // Get financial summary
    const [financialSummary] = await connection.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN t.payment_status = 'paid' AND ti.status = 'completed' THEN ti.subtotal END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN t.payment_status = 'paid' AND ti.status = 'completed' AND DATE(t.created_at) = CURDATE() THEN ti.subtotal END), 0) as today_revenue,
        COALESCE(SUM(CASE WHEN t.payment_status = 'paid' AND ti.status = 'completed' AND YEARWEEK(t.created_at) = YEARWEEK(CURDATE()) THEN ti.subtotal END), 0) as week_revenue,
        COALESCE(SUM(CASE WHEN t.payment_status = 'paid' AND ti.status = 'completed' AND MONTH(t.created_at) = MONTH(CURDATE()) AND YEAR(t.created_at) = YEAR(CURDATE()) THEN ti.subtotal END), 0) as month_revenue,
        COALESCE(SUM(CASE WHEN t.payment_status = 'refunded' THEN ti.subtotal END), 0) as total_refunds,
        COUNT(DISTINCT CASE WHEN t.payment_status = 'paid' THEN t.id END) as total_transactions,
        COUNT(DISTINCT CASE WHEN t.payment_status = 'pending' THEN t.id END) as pending_transactions
      FROM transactions t
      INNER JOIN transaction_items ti ON t.id = ti.transaction_id
      WHERE ti.store_id = ?
    `, [storeId]);

    // Get withdrawal history
    const [withdrawals] = await connection.execute(`
      SELECT 
        id,
        amount,
        bank_name,
        account_number,
        account_name,
        status,
        notes,
        created_at,
        processed_at
      FROM store_withdrawals 
      WHERE store_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [storeId]);

    res.json({
      success: true,
      data: {
        balance: storeBalance[0].balance,
        summary: financialSummary[0],
        withdrawals: withdrawals
      }
    });

  } catch (error) {
    console.error('Error fetching store finance:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data keuangan'
    });
  } finally {
    connection.release();
  }
};

// Get detailed transaction history
const getTransactionHistory = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 20, type = 'all', date_from = '', date_to = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE ti.store_id = ?';
    let queryParams = [storeId];

    if (type === 'revenue') {
      whereClause += ' AND t.payment_status = "paid"';
    } else if (type === 'pending') {
      whereClause += ' AND t.payment_status = "pending"';
    }

    // Date range filtering (inclusive)
    if (date_from && date_to) {
      whereClause += ' AND DATE(t.created_at) BETWEEN ? AND ?';
      queryParams.push(date_from, date_to);
    } else if (date_from) {
      whereClause += ' AND DATE(t.created_at) >= ?';
      queryParams.push(date_from);
    } else if (date_to) {
      whereClause += ' AND DATE(t.created_at) <= ?';
      queryParams.push(date_to);
    }

    // Get transaction history
    const [transactions] = await connection.execute(`
      SELECT 
        t.id,
        t.transaction_code,
        t.customer_name,
        t.customer_phone,
        t.total_amount,
        t.payment_status,
        t.payment_method,
        t.created_at,
        ti.item_name,
        ti.subtotal,
        ti.quantity
      FROM transactions t
      INNER JOIN transaction_items ti ON t.id = ti.transaction_id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    // Get total count
    const [countResult] = await connection.execute(`
      SELECT COUNT(DISTINCT t.id) as total
      FROM transactions t
      INNER JOIN transaction_items ti ON t.id = ti.transaction_id
      ${whereClause}
    `, queryParams);

    const totalTransactions = countResult[0].total;
    const totalPages = Math.ceil(totalTransactions / limit);

    res.json({
      success: true,
      data: {
        transactions: transactions,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_transactions: totalTransactions,
          per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat transaksi'
    });
  } finally {
    connection.release();
  }
};

// Create withdrawal request
const createWithdrawal = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { storeId } = req.params;
    const { amount, bank_name, account_number, account_name } = req.body;

    // Validate input
    if (!amount || !bank_name || !account_number || !account_name) {
      return res.status(400).json({
        success: false,
        message: 'Semua field wajib diisi'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Jumlah penarikan harus lebih dari 0'
      });
    }

    // Check store balance
    const [storeBalance] = await connection.execute(`
      SELECT balance 
      FROM stores 
      WHERE id = ?
    `, [storeId]);

    if (storeBalance.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Toko tidak ditemukan'
      });
    }

    const currentBalance = parseFloat(storeBalance[0].balance);
    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount > currentBalance) {
      return res.status(400).json({
        success: false,
        message: 'Saldo tidak mencukupi'
      });
    }

    await connection.beginTransaction();

    try {
      // Create withdrawal request
      const [withdrawalResult] = await connection.execute(`
        INSERT INTO store_withdrawals 
        (store_id, amount, bank_name, account_number, account_name, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `, [storeId, withdrawAmount, bank_name, account_number, account_name]);

      // Update store balance (deduct the amount)
      await connection.execute(`
        UPDATE stores 
        SET balance = balance - ?
        WHERE id = ?
      `, [withdrawAmount, storeId]);

      await connection.commit();

      res.json({
        success: true,
        message: 'Permintaan penarikan berhasil dibuat',
        data: {
          withdrawal_id: withdrawalResult.insertId
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error creating withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat permintaan penarikan'
    });
  } finally {
    connection.release();
  }
};

// Get revenue analytics
const getRevenueAnalytics = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { storeId } = req.params;
    const { period = 'monthly' } = req.query;

    let dateFormat, dateInterval;
    
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        dateInterval = 'INTERVAL 30 DAY';
        break;
      case 'weekly':
        dateFormat = '%Y-%u';
        dateInterval = 'INTERVAL 12 WEEK';
        break;
      case 'yearly':
        dateFormat = '%Y';
        dateInterval = 'INTERVAL 5 YEAR';
        break;
      default: // monthly
        dateFormat = '%Y-%m';
        dateInterval = 'INTERVAL 12 MONTH';
    }

    // Get revenue analytics
    const [analytics] = await connection.execute(`
      SELECT 
        DATE_FORMAT(t.created_at, '${dateFormat}') as period,
        COALESCE(SUM(ti.subtotal), 0) as revenue,
        COUNT(DISTINCT t.id) as transactions,
        COUNT(ti.id) as items_sold
      FROM transactions t
      INNER JOIN transaction_items ti ON t.id = ti.transaction_id
      WHERE ti.store_id = ? 
        AND t.payment_status = 'paid'
        AND ti.status = 'completed'
        AND t.created_at >= DATE_SUB(CURRENT_DATE, ${dateInterval})
      GROUP BY DATE_FORMAT(t.created_at, '${dateFormat}')
      ORDER BY period DESC
    `, [storeId]);

    // Get top selling products
    const [topProducts] = await connection.execute(`
      SELECT 
        p.name as product_name,
        p.poster_url,
        SUM(ti.quantity) as total_sold,
        SUM(ti.subtotal) as total_revenue
      FROM transaction_items ti
      INNER JOIN transactions t ON ti.transaction_id = t.id
      INNER JOIN products p ON ti.product_id = p.id
      WHERE ti.store_id = ? 
        AND t.payment_status = 'paid'
        AND ti.status = 'completed'
        AND t.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
      GROUP BY ti.product_id, p.name, p.poster_url
      ORDER BY total_sold DESC
      LIMIT 5
    `, [storeId]);

    res.json({
      success: true,
      data: {
        analytics: analytics,
        top_products: topProducts
      }
    });

  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil analitik pendapatan'
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getStoreFinance,
  getTransactionHistory,
  createWithdrawal,
  getRevenueAnalytics
};
