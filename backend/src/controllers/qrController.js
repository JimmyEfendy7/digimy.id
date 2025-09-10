const { pool } = require('../config/database');
const qrService = require('../services/qrService');

/**
 * Get scanned QR codes for a store (dashboard view)
 */
const getStoreScannedQRs = async (req, res) => {
  let connection;
  
  try {
    const { storeId } = req.params;
    
    connection = await pool.getConnection();

    // Get all scanned QR codes for this store
    const [scannedQRs] = await connection.execute(`
      SELECT 
        t.id,
        t.transaction_code,
        t.customer_name,
        t.customer_phone,
        t.total_amount,
        t.qr_code,
        t.is_scan,
        t.created_at,
        t.updated_at,
        p.name as product_name,
        p.poster_url as product_image,
        ti.quantity,
        ti.item_price,
        s.name as store_name
      FROM transactions t
      JOIN transaction_items ti ON t.id = ti.transaction_id
      JOIN products p ON ti.product_id = p.id AND p.is_appointment = 1
      JOIN stores s ON p.store_id = s.id
      WHERE p.store_id = ? 
        AND t.payment_status = 'paid'
        AND t.qr_code IS NOT NULL
      ORDER BY t.is_scan ASC, t.created_at DESC
    `, [storeId]);

    res.json({
      success: true,
      data: scannedQRs
    });

  } catch (error) {
    console.error('Error fetching store scanned QRs:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data QR scan',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Verify and process QR code scan
 */
const scanQRCode = async (req, res) => {
  let connection;
  
  try {
    const { storeId } = req.params;
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'Data QR Code diperlukan'
      });
    }

    // Verify QR code data
    const verification = qrService.verifyAppointmentQR(qrData);
    
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    const qrInfo = verification.data;
    connection = await pool.getConnection();

    // Check if transaction exists and belongs to this store
    const [transactions] = await connection.execute(`
      SELECT 
        t.id,
        t.transaction_code,
        t.customer_name,
        t.customer_phone,
        t.total_amount,
        t.payment_status,
        t.qr_code,
        t.is_scan,
        p.name as product_name,
        p.poster_url as product_image,
        ti.quantity,
        ti.price,
        s.id as store_id,
        s.name as store_name
      FROM transactions t
      JOIN transaction_items ti ON t.id = ti.transaction_id
      JOIN products p ON ti.product_id = p.id AND p.is_appointment = 1
      JOIN stores s ON p.store_id = s.id
      WHERE t.transaction_code = ? AND s.id = ?
      LIMIT 1
    `, [qrInfo.transaction_code, storeId]);

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi tidak ditemukan atau tidak memiliki akses'
      });
    }

    const transaction = transactions[0];

    // Check if payment is completed
    if (transaction.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Transaksi belum dibayar'
      });
    }

    // Check if already scanned
    if (transaction.is_scan) {
      return res.status(400).json({
        success: false,
        message: 'Kode QR sudah digunakan',
        data: {
          transaction_code: transaction.transaction_code,
          customer_name: transaction.customer_name,
          scan_status: 'already_used'
        }
      });
    }

    // Update scan status
    await connection.execute(`
      UPDATE transactions 
      SET is_scan = 1, updated_at = NOW() 
      WHERE id = ?
    `, [transaction.id]);

    // Return success with transaction data
    res.json({
      success: true,
      message: 'QR Code berhasil dipindai',
      data: {
        ...transaction,
        scan_status: 'success',
        scanned_at: new Date()
      }
    });

  } catch (error) {
    console.error('Error scanning QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memindai QR Code',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Get QR scan statistics for store dashboard
 */
const getQRScanStats = async (req, res) => {
  let connection;
  
  try {
    const { storeId } = req.params;
    
    connection = await pool.getConnection();

    // Get QR scan statistics
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_appointments,
        SUM(CASE WHEN t.is_scan = 1 THEN 1 ELSE 0 END) as scanned_appointments,
        SUM(CASE WHEN t.is_scan = 0 THEN 1 ELSE 0 END) as pending_appointments,
        SUM(t.total_amount) as total_appointment_revenue,
        SUM(CASE WHEN t.is_scan = 1 THEN t.total_amount ELSE 0 END) as scanned_revenue
      FROM transactions t
      JOIN transaction_items ti ON t.id = ti.transaction_id
      JOIN products p ON ti.product_id = p.id AND p.is_appointment = 1
      WHERE p.store_id = ? 
        AND t.payment_status = 'paid'
        AND t.qr_code IS NOT NULL
    `, [storeId]);

    // Get recent scans (last 7 days)
    const [recentScans] = await connection.execute(`
      SELECT 
        DATE(t.updated_at) as scan_date,
        COUNT(*) as scans_count
      FROM transactions t
      JOIN transaction_items ti ON t.id = ti.transaction_id
      JOIN products p ON ti.product_id = p.id AND p.is_appointment = 1
      WHERE p.store_id = ? 
        AND t.payment_status = 'paid'
        AND t.is_scan = 1
        AND t.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(t.updated_at)
      ORDER BY scan_date DESC
    `, [storeId]);

    res.json({
      success: true,
      data: {
        stats: stats[0] || {
          total_appointments: 0,
          scanned_appointments: 0,
          pending_appointments: 0,
          total_appointment_revenue: 0,
          scanned_revenue: 0
        },
        recent_scans: recentScans
      }
    });

  } catch (error) {
    console.error('Error fetching QR scan stats:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil statistik QR scan',
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getStoreScannedQRs,
  scanQRCode,
  getQRScanStats
};
