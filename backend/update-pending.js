/**
 * Script untuk memperbarui status transaksi pending secara manual
 * 
 * Cara menjalankan:
 * node update-pending.js
 */
const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || `${process.env.APP_URL || 'http://localhost:5000'}/api`;

async function updatePendingTransactions() {
  console.log('Memperbarui semua transaksi pending...');
  
  try {
    const response = await axios.get(`${API_URL}/admin/update-all-pending-transactions`);
    
    console.log('Hasil update:');
    console.log(`- Total: ${response.data.data.total}`);
    console.log(`- Berhasil diupdate: ${response.data.data.updated}`);
    console.log(`- Gagal: ${response.data.data.failed}`);
    
    if (response.data.data.updated_transactions && response.data.data.updated_transactions.length > 0) {
      console.log('\nTransaksi yang diperbarui:');
      response.data.data.updated_transactions.forEach((tx, idx) => {
        console.log(`${idx + 1}. ${tx.transaction_code}: ${tx.previous_status} -> ${tx.new_status} (${tx.payment_method})`);
      });
    }
    
    console.log('\nProses selesai!');
  } catch (error) {
    console.error('Terjadi kesalahan:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

updatePendingTransactions(); 