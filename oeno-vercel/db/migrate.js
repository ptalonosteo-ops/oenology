'use strict';
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL absent — migration ignorée.');
  process.exit(0);
}

const { pool } = require('./index');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cepages (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, famille TEXT DEFAULT '',
  origine TEXT DEFAULT '', description TEXT DEFAULT '',
  color TEXT DEFAULT '#8b7355', aromes JSONB DEFAULT '[]',
  sols JSONB DEFAULT '[]', notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS geo_soils (
  id SERIAL PRIMARY KEY, cepage_id TEXT NOT NULL REFERENCES cepages(id) ON DELETE CASCADE,
  pays TEXT DEFAULT 'fr', sort_order INTEGER DEFAULT 0,
  nom TEXT DEFAULT '', region TEXT DEFAULT '', age TEXT DEFAULT '',
  description TEXT DEFAULT '', structure JSONB DEFAULT '{}',
  aromes JSONB DEFAULT '[]', key_point TEXT DEFAULT '', fiche JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS terroirs (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, region TEXT DEFAULT '',
  cepage_id TEXT REFERENCES cepages(id) ON DELETE SET NULL,
  pays TEXT DEFAULT 'fr', superficie TEXT DEFAULT '', altitude TEXT DEFAULT '',
  orientation TEXT DEFAULT '', clim TEXT DEFAULT '', sol TEXT DEFAULT '',
  ensoleillement TEXT DEFAULT '', gel TEXT DEFAULT '',
  temperatures JSONB DEFAULT '[]', precipitations JSONB DEFAULT '[]',
  coupe JSONB DEFAULT '{}', appellations JSONB DEFAULT '[]',
  key_point TEXT DEFAULT '', geo_text TEXT DEFAULT '', hist_text TEXT DEFAULT '',
  map_pos JSONB DEFAULT '[0,0]',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS exos (
  id TEXT PRIMARY KEY, titre TEXT DEFAULT '', type TEXT DEFAULT '',
  niveau TEXT DEFAULT '', cepages JSONB DEFAULT '[]',
  ai BOOLEAN DEFAULT FALSE, statut TEXT DEFAULT 'actif',
  description TEXT DEFAULT '', sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_geo ON geo_soils(cepage_id, pays, sort_order);
`;

(async () => {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA);
    console.log('✓ Tables prêtes.');
  } finally { client.release(); await pool.end(); }
})().catch(e => { console.error('Migration error:', e.message); process.exit(1); });
