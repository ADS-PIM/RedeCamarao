const { Pool } = require('pg');
const { databaseOptions } = require('../database/config/connection');

async function main() {
  const pool = new Pool(databaseOptions());
  try {
    const { rows } = await pool.query(`SELECT current_database() AS database,
      current_user AS username, ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()`);
    console.log('PostgreSQL connected:', rows[0]);
    const tables = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
    console.log('Tables:', tables.rows.map(row => row.tablename).join(', ') || '(empty database)');
  } catch (error) {
    console.error('PostgreSQL connection failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
