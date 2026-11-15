const fs = require('node:fs');
const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

// Shared by node-postgres and Sequelize CLI.
function databaseOptions(env = process.env) {
  const url = env.DATABASE_URL ? new URL(env.DATABASE_URL) : null;
  if (url && !['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use postgres:// or postgresql://');
  }
  const sslmode = env.DB_SSL_MODE || url?.searchParams.get('sslmode')
    || (env.DB_SSL === 'true' ? 'verify-full' : 'disable');
  if (!['disable', 'require', 'verify-ca', 'verify-full'].includes(sslmode)) {
    throw new Error('DB_SSL_MODE must be disable, require, verify-ca or verify-full');
  }
  const ca = env.DB_SSL_CA?.replace(/\\n/g, '\n')
    || (env.DB_SSL_CA_PATH ? fs.readFileSync(path.resolve(__dirname, '../..', env.DB_SSL_CA_PATH), 'utf8') : undefined);
  const max = Number(env.DB_POOL_MAX || 5);
  const port = Number(url?.port || env.DB_PORT || 5432);
  if (!Number.isInteger(max) || max < 1 || max > 15) {
    throw new Error('DB_POOL_MAX must be an integer from 1 to 15 (Aiven limit: 20 connections)');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid database port');
  return {
    host: url?.hostname || env.DB_HOST || '127.0.0.1',
    port,
    user: url ? decodeURIComponent(url.username) : env.DB_USER || 'postgres',
    password: url ? decodeURIComponent(url.password) : env.DB_PASSWORD || '',
    database: url ? decodeURIComponent(url.pathname.slice(1)) : env.DB_NAME || 'redecamarao',
    // require matches the supplied Aiven URI. Adding the CA enables server verification.
    ssl: sslmode === 'disable' ? false : { rejectUnauthorized: sslmode !== 'require' || Boolean(ca), ...(ca ? { ca } : {}) },
    max,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  };
}

module.exports = { databaseOptions };
