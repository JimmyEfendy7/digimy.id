const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function describeTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  console.log('Describing transactions table...');
  const [rows] = await connection.query('DESCRIBE transactions');
  console.log(rows);
  
  console.log('\nChecking payment_status enum values...');
  const [enums] = await connection.query(`
    SELECT COLUMN_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'transactions' 
    AND COLUMN_NAME = 'payment_status'
  `);
  console.log(enums);
  
  await connection.end();
}

describeTable().catch(console.error); 