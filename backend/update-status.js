/**
 * Script untuk memperbarui status transaksi secara manual
 * 
 * Cara penggunaan:
 * - Untuk update semua transaksi pending:
 *   node update-status.js
 * 
 * - Untuk update satu transaksi tertentu:
 *   node update-status.js <transaction_code>
 */

require('dotenv').config();
const { pool } = require('./src/config/database');
const axios = require('axios');

// Konfigurasi midtrans
const isSandbox = process.env.NODE_ENV !== 'production';
const serverKey = isSandbox 
  ? (process.env.MIDTRANS_SERVER_KEY_SANDBOX || process.env.MIDTRANS_SERVER_KEY)
  : (process.env.MIDTRANS_SERVER_KEY_PRODUCTION || process.env.MIDTRANS_SERVER_KEY);

// Fungsi untuk update status transaksi
const updateTransactionStatus = async (transactionCode, status, paymentData) => {
  try {
    console.log(`📊 Memperbarui status transaksi ${transactionCode} ke: ${status}`);
    
    // Pemetaan status dan metode pembayaran
    let dbStatus = status;
    const paymentMethod = paymentData?.payment_type || null;
    
    // Update status di database
    const updateQuery = `
      UPDATE transactions
      SET payment_status = ?, payment_method = ?
      WHERE transaction_code = ? OR midtrans_transaction_id = ?
    `;
    
    const [result] = await pool.query(updateQuery, [
      dbStatus,
      paymentMethod,
      transactionCode,
      transactionCode
    ]);
    
    console.log(`✅ Status transaksi berhasil diperbarui: ${result.affectedRows} row(s)`);
    return result.affectedRows > 0;
  } catch (error) {
    console.error(`❌ Error saat memperbarui status:`, error);
    return false;
  }
};

// Fungsi untuk cek status di Midtrans
const checkMidtransStatus = async (orderId) => {
  try {
    console.log(`🔍 Memeriksa status transaksi ${orderId} di Midtrans...`);
    
    // Tentukan URL berdasarkan mode
    const apiUrl = isSandbox
      ? `https://api.sandbox.midtrans.com/v2/${orderId}/status`
      : `https://api.midtrans.com/v2/${orderId}/status`;
    
    // Persiapkan auth
    const auth = Buffer.from(`${serverKey}:`).toString('base64');
    
    // Panggil API Midtrans
    const response = await axios.get(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      }
    });
    
    if (!response.data) {
      throw new Error('Respons kosong dari API Midtrans');
    }
    
    console.log(`✅ Status dari Midtrans: ${response.data.transaction_status}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error saat memeriksa status di Midtrans:`, 
      error.response ? error.response.data : error.message);
    return null;
  }
};

// Fungsi untuk memperbarui satu transaksi
const updateOneTransaction = async (transactionCode) => {
  try {
    console.log(`\n=== MEMPERBARUI TRANSAKSI: ${transactionCode} ===`);
    
    // Cek transaksi di database
    const [transactions] = await pool.query(
      `SELECT id, transaction_code, payment_status, payment_method 
       FROM transactions 
       WHERE transaction_code = ?`,
      [transactionCode]
    );
    
    if (transactions.length === 0) {
      console.error(`❌ Transaksi ${transactionCode} tidak ditemukan`);
      return false;
    }
    
    const transaction = transactions[0];
    console.log(`📝 Detail transaksi: ID=${transaction.id}, Status=${transaction.payment_status}`);
    
    // Cek status di Midtrans
    const midtransStatus = await checkMidtransStatus(transactionCode);
    
    if (!midtransStatus) {
      console.error(`❌ Tidak dapat memeriksa status di Midtrans`);
      return false;
    }
    
    // Tentukan status baru
    let newStatus;
    if (['settlement', 'capture'].includes(midtransStatus.transaction_status)) {
      newStatus = 'paid';
    } else if (['deny', 'cancel', 'expire'].includes(midtransStatus.transaction_status)) {
      newStatus = 'failed';
    } else {
      newStatus = 'pending';
    }
    
    // Update status transaksi jika berbeda
    if (transaction.payment_status !== newStatus) {
      console.log(`📊 Mengubah status: ${transaction.payment_status} -> ${newStatus}`);
      await updateTransactionStatus(transactionCode, newStatus, midtransStatus);
      
      // Cek hasil update
      const [updatedTrx] = await pool.query(
        'SELECT payment_status FROM transactions WHERE transaction_code = ?',
        [transactionCode]
      );
      
      if (updatedTrx.length > 0) {
        console.log(`✅ Status setelah update: ${updatedTrx[0].payment_status}`);
      }
      
      return true;
    } else {
      console.log(`ℹ️ Status transaksi sudah benar: ${transaction.payment_status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error saat memperbarui transaksi:`, error);
    return false;
  }
};

// Fungsi untuk memperbarui semua transaksi pending
const updatePendingTransactions = async () => {
  try {
    console.log('\n=== MEMPERBARUI SEMUA TRANSAKSI PENDING ===');
    
    // Ambil semua transaksi pending
    const [pendingTransactions] = await pool.query(
      `SELECT id, transaction_code, payment_status 
       FROM transactions 
       WHERE payment_status = 'pending'
       ORDER BY id DESC`
    );
    
    console.log(`🔍 Ditemukan ${pendingTransactions.length} transaksi pending`);
    
    if (pendingTransactions.length === 0) {
      console.log('✅ Tidak ada transaksi pending yang perlu diperbarui');
      return [];
    }
    
    const results = [];
    
    // Update setiap transaksi
    for (const transaction of pendingTransactions) {
      console.log(`\n📝 Memeriksa transaksi: ${transaction.transaction_code}`);
      
      const updated = await updateOneTransaction(transaction.transaction_code);
      results.push({
        transaction_code: transaction.transaction_code,
        updated
      });
      
      // Tunggu sebentar agar tidak overload API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Tampilkan ringkasan
    const successCount = results.filter(r => r.updated).length;
    console.log(`\n=== RINGKASAN UPDATE ===`);
    console.log(`✅ ${successCount} dari ${results.length} transaksi berhasil diperbarui`);
    
    return results;
  } catch (error) {
    console.error(`❌ Error saat memperbarui transaksi pending:`, error);
    return [];
  }
};

// Main function
const main = async () => {
  try {
    // Cek apakah ada parameter transaksi
    const transactionCode = process.argv[2];
    
    if (transactionCode) {
      // Update satu transaksi
      await updateOneTransaction(transactionCode);
    } else {
      // Update semua transaksi pending
      await updatePendingTransactions();
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Tutup koneksi database
    pool.end();
    process.exit(0);
  }
};

// Jalankan program
main(); 