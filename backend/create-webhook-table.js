/**
 * Script untuk membuat tabel webhook_logs dalam database
 * Jalankan dengan: node create-webhook-table.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'digipro_db',
};

async function createWebhookLogsTable() {
  console.log('Mencoba membuat tabel webhook_logs...');
  
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // SQL untuk membuat tabel
    const createTableSQL = `
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id VARCHAR(100) NOT NULL,
      transaction_status VARCHAR(50) DEFAULT 'unknown',
      payment_type VARCHAR(50) DEFAULT 'unknown',
      amount DECIMAL(15, 2) DEFAULT 0,
      received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      raw_data TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (order_id),
      INDEX (received_at)
    );
    `;
    
    // Jalankan SQL
    await connection.execute(createTableSQL);
    
    console.log('✅ Tabel webhook_logs berhasil dibuat atau sudah ada');
    
    // Periksa apakah tabel sudah ada
    const [rows] = await connection.execute('SHOW TABLES LIKE "webhook_logs"');
    if (rows.length > 0) {
      console.log('Struktur tabel:');
      const [columns] = await connection.execute('DESCRIBE webhook_logs');
      columns.forEach(col => {
        console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
    }
  } catch (error) {
    console.error('Error membuat tabel webhook_logs:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Jalankan fungsi
createWebhookLogsTable(); 