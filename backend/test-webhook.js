/**
 * Script untuk menguji endpoint webhook Midtrans
 * Mengirimkan notifikasi simulasi ke endpoint webhook
 * 
 * Cara menggunakan:
 * node test-webhook.js ORDER-ID TRANSACTION-STATUS
 * 
 * Contoh:
 * node test-webhook.js ORDER-1746427735903 settlement
 */

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

// Ambil argumen dari command line
const args = process.argv.slice(2);
const order_id = args[0];
const transaction_status = args[1] || 'settlement';

// Validasi argumen
if (!order_id) {
  console.error('Error: ORDER-ID diperlukan');
  console.log('Penggunaan: node test-webhook.js ORDER-ID [TRANSACTION-STATUS]');
  process.exit(1);
}

// Konfigurasi
const API_URL = process.env.API_URL || `${process.env.APP_URL || 'http://localhost:5000'}/api`;
const serverKey = process.env.MIDTRANS_SERVER_KEY_SANDBOX || process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-xxxxxxxxxxx';

// URL endpoint webhook
const webhookUrl = `${API_URL}/payment-notification`;

async function testWebhook() {
  console.log(`\n===== MENGIRIM WEBHOOK TEST =====`);
  console.log(`Order ID: ${order_id}`);
  console.log(`Transaction Status: ${transaction_status}`);
  console.log(`Webhook URL: ${webhookUrl}`);
  
  try {
    // Ambil data transaksi dari database (jika ada)
    let transactionAmount = 150000; // Default amount
    
    try {
      // Terhubung ke database dan dapatkan jumlah transaksi actual (opsional)
      // Ini hanya contoh, Anda bisa mengganti dengan nilai statis
      
      // const mysql = require('mysql2/promise');
      // const connection = await mysql.createConnection({
      //   host: process.env.DB_HOST || 'localhost',
      //   user: process.env.DB_USER || 'root',
      //   password: process.env.DB_PASSWORD || '',
      //   database: process.env.DB_NAME || 'digipro_db'
      // });
      
      // const [rows] = await connection.query(
      //   'SELECT total_amount FROM transactions WHERE transaction_code = ?',
      //   [order_id]
      // );
      
      // if (rows && rows.length > 0) {
      //   transactionAmount = rows[0].total_amount;
      //   console.log(`Menggunakan jumlah transaksi dari database: ${transactionAmount}`);
      // }
      
      // await connection.end();
    } catch (dbError) {
      console.log('Tidak dapat mengambil jumlah transaksi dari database, menggunakan nilai default');
    }
    
    // Format jumlah transaksi
    const gross_amount = transactionAmount.toString();
    
    // Tentukan status_code berdasarkan transaction_status
    let status_code = '200';
    if (transaction_status === 'deny') status_code = '202';
    else if (transaction_status === 'cancel') status_code = '202';
    else if (transaction_status === 'expire') status_code = '202';
    else if (transaction_status === 'pending') status_code = '201';
    
    // Buat signature key
    const signatureKey = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex');
    
    // Siapkan payload notifikasi (sama seperti format Midtrans)
    const payload = {
      transaction_time: new Date().toISOString(),
      transaction_status: transaction_status,
      transaction_id: `mid-${Date.now()}`,
      status_message: `midtrans payment notification`,
      status_code: status_code,
      signature_key: signatureKey,
      payment_type: 'bank_transfer',
      order_id: order_id,
      merchant_id: 'G123456789',
      gross_amount: gross_amount,
      fraud_status: 'accept',
      currency: 'IDR',
      va_numbers: [
        {
          bank: 'bca',
          va_number: '12345678901'
        }
      ]
    };
    
    console.log('\nPayload yang akan dikirim:');
    console.log(JSON.stringify(payload, null, 2));
    
    // Kirim request ke webhook endpoint
    console.log('\nMengirim request...');
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Midtrans Webhook Simulator'
      }
    });
    
    console.log('\nResponse:');
    console.log(`Status: ${response.status}`);
    console.log('Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n✅ Webhook test berhasil dikirim!');
  } catch (error) {
    console.error('\n❌ Error mengirim webhook test:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:');
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

// Jalankan test
testWebhook(); 