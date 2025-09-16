const pool = require('./src/db/connection');

async function diagnoseProductionData() {
  console.log('\n🔍 ===== PRODUCTION DATA DIAGNOSIS =====\n');
  
  const connection = await pool.getConnection();
  
  try {
    // 1. Check all stores and their verification status
    console.log('1. STORE VERIFICATION STATUS:');
    const [stores] = await connection.execute(`
      SELECT id, name, is_verified, created_at 
      FROM stores 
      ORDER BY created_at DESC
    `);
    
    stores.forEach(store => {
      console.log(`   Store ID ${store.id}: ${store.name} → is_verified: ${store.is_verified}`);
    });
    
    // 2. Check all products and their active/verified status
    console.log('\n2. PRODUCT STATUS:');
    const [products] = await connection.execute(`
      SELECT p.id, p.name, p.is_active, p.is_verified, p.store_id, s.name as store_name, s.is_verified as store_verified
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      ORDER BY p.created_at DESC
    `);
    
    products.forEach(product => {
      console.log(`   Product ${product.id}: ${product.name}`);
      console.log(`     - is_active: ${product.is_active}, is_verified: ${product.is_verified}`);
      console.log(`     - Store: ${product.store_name} (verified: ${product.store_verified})`);
      console.log('');
    });
    
    // 3. Check what products would pass homepage filter
    console.log('3. HOMEPAGE FILTER TEST (is_active=1 AND is_verified=1):');
    const [homepageProducts] = await connection.execute(`
      SELECT p.id, p.name, s.name as store_name
      FROM products p
      INNER JOIN stores s ON p.store_id = s.id
      WHERE p.is_active = 1 AND p.is_verified = 1 AND s.is_verified = 1
    `);
    
    console.log(`   → ${homepageProducts.length} products would show on homepage`);
    homepageProducts.forEach(product => {
      console.log(`     - ${product.name} (Store: ${product.store_name})`);
    });
    
    // 4. Check what products would pass store filter for each store
    console.log('\n4. STORE PRODUCT FILTER TEST:');
    for (const store of stores) {
      const [storeProducts] = await connection.execute(`
        SELECT p.id, p.name
        FROM products p
        WHERE p.store_id = ? AND p.is_active = 1
      `, [store.id]);
      
      console.log(`   Store "${store.name}" (verified: ${store.is_verified}):`);
      console.log(`     → ${storeProducts.length} active products`);
      
      if (store.is_verified === 0) {
        console.log(`     ⚠️  Store NOT verified - would be hidden from customers`);
      }
    }
    
  } catch (error) {
    console.error('Diagnostic error:', error);
  } finally {
    connection.release();
  }
}

// Run diagnosis
diagnoseProductionData()
  .then(() => {
    console.log('\n✅ Diagnosis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to run diagnosis:', error);
    process.exit(1);
  });
