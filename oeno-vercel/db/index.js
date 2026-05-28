'use strict';
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
});
pool.on('error', e => console.error('DB error:', e.message));

module.exports = { pool, query: (sql, p) => pool.query(sql, p) };
