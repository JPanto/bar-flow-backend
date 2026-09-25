import { db, pool } from './client.js';
import { initializeDatabase } from './bootstrap.js';

async function run() {
  console.log('🔄 Running BarFlow database migrations...');
  try {
    const result = await initializeDatabase(db, pool);
    console.log(`✅ Database schema verified and initialized using: ${result.method}`);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to initialize database schema:', err);
    await pool.end();
    process.exit(1);
  }
}

run();
