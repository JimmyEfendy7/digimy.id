/**
 * Script untuk update status transaksi secara terjadwal dengan cron
 * 
 * Cara menggunakan:
 * 1. Tambahkan ke crontab untuk dijalankan setiap 6 jam dan output disimpan ke log file
 * 
 * Ini akan memastikan status transaksi selalu diperbarui sebagai fallback jika webhook gagal.
 */

require('dotenv').config();
const axios = require('axios');

// Konfigurasi
const API_URL = process.env.API_URL || `${process.env.APP_URL || 'http://localhost:5000'}/api`;
const MAX_HOURS = process.env.MAX_TRANSACTION_HOURS || 72; // Periksa transaksi hingga 72 jam ke belakang
const API_KEY = process.env.CRON_API_KEY || 'change-this-to-secure-key';

// Format waktu
function formatTime(date) {
  return date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

// Catat ke log dengan timestamp
function log(message) {
  console.log(`[${formatTime(new Date())}] ${message}`);
}

async function updatePendingTransactions() {
  log('===== CRON: UPDATE PENDING TRANSACTIONS =====');
  log(`Checking transactions from last ${MAX_HOURS} hours`);
  
  try {
    // Tambahkan API key ke header untuk otentikasi (jika diperlukan)
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Jika API_KEY ditentukan, tambahkan ke header
    if (API_KEY && API_KEY !== 'change-this-to-secure-key') {
      headers['X-API-Key'] = API_KEY;
    } else {
      log('⚠️ Peringatan: menggunakan API key default. Sebaiknya ganti dengan key yang aman di .env');
    }
    
    const response = await axios.get(`${API_URL}/admin/update-all-pending-transactions`, {
      headers,
      params: {
        hours: MAX_HOURS
      }
    });
    
    // Catat hasil
    log(`Total transaksi: ${response.data.data.total}`);
    log(`Berhasil diupdate: ${response.data.data.updated}`);
    log(`Gagal diupdate: ${response.data.data.failed}`);
    
    // Log detail transaksi yang diupdate
    if (response.data.data.updated_transactions && response.data.data.updated_transactions.length > 0) {
      log('\nTransaksi yang diperbarui:');
      response.data.data.updated_transactions.forEach((tx, idx) => {
        log(`- ${tx.transaction_code}: ${tx.previous_status} -> ${tx.new_status} (${tx.payment_method})`);
      });
    }
    
    // Log detail transaksi yang gagal diupdate
    if (response.data.data.failed_transactions && response.data.data.failed_transactions.length > 0) {
      log('\nTransaksi yang gagal diperbarui:');
      response.data.data.failed_transactions.forEach((tx, idx) => {
        log(`- ${tx.transaction_code}: ${tx.error}`);
      });
    }
    
    log('\n✅ Proses selesai!');
  } catch (error) {
    log('\n❌ Error saat menjalankan update transaksi:');
    
    if (error.response) {
      log(`Status: ${error.response.status}`);
      log(`Response: ${JSON.stringify(error.response.data)}`);
    } else {
      log(`Error: ${error.message}`);
    }
  }
}

// Jalankan proses
updatePendingTransactions();

// Tambahkan exit handler untuk memastikan proses selesai dengan baik
process.on('exit', () => {
  log('Process exited');
});

// Tangani kesalahan yang tidak tertangani
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`);
  log(error.stack);
  process.exit(1);
});

// Tangani penolakan promise yang tidak tertangani
process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled Rejection at:');
  log(promise);
  log(`Reason: ${reason}`);
  process.exit(1);
}); 