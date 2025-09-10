const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function runMigration() {
  console.log('🔄 Starting database migration...');
  
  // Buat koneksi ke database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true // Penting untuk menjalankan beberapa query sekaligus
  });
  
  try {
    // Baca file migrasi
    const migrationPath = path.join(__dirname, 'src', 'db', 'migrations', '01_create_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Jalankan migrasi
    console.log('🔄 Executing database migration...');
    await connection.query(migrationSQL);
    
    console.log('✅ Database migration completed successfully');
    
    // Periksa apakah tabel webhook_logs sudah ada
    console.log('🔍 Verifying webhook_logs table exists...');
    try {
      const [rows] = await connection.query(`
        SELECT COUNT(*) as table_exists 
        FROM information_schema.tables 
        WHERE table_schema = 'digipro' AND table_name = 'webhook_logs'
      `);
      
      if (rows[0].table_exists > 0) {
        console.log('✅ webhook_logs table exists');
      } else {
        console.log('❌ webhook_logs table not found, creating it...');
        
        // Buat tabel webhook_logs jika belum ada
        await connection.query(`
          CREATE TABLE IF NOT EXISTS webhook_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id VARCHAR(100) NOT NULL,
            transaction_status VARCHAR(50),
            payment_type VARCHAR(50),
            amount DECIMAL(15, 2),
            raw_notification TEXT,
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        console.log('✅ webhook_logs table created successfully');
      }
    } catch (error) {
      console.error('Error verifying webhook_logs table:', error);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await connection.end();
    console.log('🔚 Database connection closed');
  }
}

// Jalankan migrasi
runMigration()
  .then(() => {
    console.log('🎉 Migration script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Migration script failed:', err);
    process.exit(1);
  }); 