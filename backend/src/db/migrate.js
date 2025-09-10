require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const migrationDir = path.join(__dirname, 'migrations');
const seedDir = path.join(__dirname, 'seeds');

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function executeSqlFile(connection, filePath) {
  try {
    console.log(`Reading SQL file: ${path.basename(filePath)}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Executing SQL file: ${path.basename(filePath)}`);
    const results = await connection.query(sql);
    console.log(`Successfully executed SQL file: ${path.basename(filePath)}`);
    return results;
  } catch (error) {
    console.error(`Error executing SQL file ${path.basename(filePath)}:`, error);
    throw error;
  }
}

async function migrate() {
  let connection;
  
  try {
    console.log('Starting migration...');
    console.log('Database config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: process.env.DB_NAME || '<not set>'
    });
    
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    
    // Get all migration files and sort them
    console.log(`Reading migration files from ${migrationDir}`);
    const migrationFiles = fs.readdirSync(migrationDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${migrationFiles.length} migration files to execute: ${migrationFiles.join(', ')}`);
    
    // Execute each migration file
    for (const file of migrationFiles) {
      const filePath = path.join(migrationDir, file);
      await executeSqlFile(connection, filePath);
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

async function seed() {
  let connection;
  
  try {
    console.log('Starting seeding...');
    
    // Create connection with database name
    connection = await mysql.createConnection({
      ...dbConfig,
      database: process.env.DB_NAME
    });
    
    // Get all seed files and sort them
    console.log(`Reading seed files from ${seedDir}`);
    const seedFiles = fs.readdirSync(seedDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${seedFiles.length} seed files to execute: ${seedFiles.join(', ')}`);
    
    // Execute each seed file
    for (const file of seedFiles) {
      const filePath = path.join(seedDir, file);
      await executeSqlFile(connection, filePath);
    }
    
    console.log('Seeding completed successfully!');
    
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

async function run() {
  const args = process.argv.slice(2);
  console.log('Running with args:', args);
  
  if (args.includes('--seed')) {
    await seed();
  } else {
    await migrate();
    
    // If --with-seed flag is provided, also run seed after migration
    if (args.includes('--with-seed')) {
      await seed();
    }
  }
}

run().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 