'use strict';
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL absent — import ignoré.');
  process.exit(0);
}

const { pool } = require('./index');
const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

(async () => {
  if (!fs.existsSync(DATA_FILE)) {
    console.log('data.json introuvable — base vide.');
    await pool.end(); return;
  }
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM cepages');
    if (rows[0].n > 0) {
      console.log(`✓ Déjà peuplé (${rows[0].n} cépages).`);
      return;
    }
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    await client.query('BEGIN');
    for (const c of (data.cepages||[])) {
      await client.query(
        `INSERT INTO cepages(id,name,famille,origine,description,color,aromes,sols,notes)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING`,
        [c.id,c.name,c.famille||'',c.origine||'',c.description||'',c.color||'#8b7355',
         JSON.stringify(c.aromes||[]),JSON.stringify(c.sols||[]),c.notes||'']);
    }
    for (const s of (data.geo_soils||[])) {
      await client.query(
        `INSERT INTO geo_soils(cepage_id,pays,sort_order,nom,region,age,description,structure,aromes,key_point,fiche)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [s.cepage_id,s.pays,s.sort_order,s.nom||'',s.region||'',s.age||'',s.description||'',
         JSON.stringify(s.structure||{}),JSON.stringify(s.aromes||[]),s.key_point||'',JSON.stringify(s.fiche||{})]);
    }
    for (let i=0; i<(data.exos||[]).length; i++) {
      const e=data.exos[i];
      await client.query(
        `INSERT INTO exos(id,titre,type,niveau,cepages,ai,statut,description,sort_order)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING`,
        [e.id,e.titre||'',e.type||'',e.niveau||'',JSON.stringify(e.cepages||[]),
         !!e.ai,e.statut||'actif',e.description||'',i]);
    }
    await client.query('COMMIT');
    console.log(`✓ Import : ${data.cepages?.length||0} cépages, ${data.geo_soils?.length||0} sols.`);
  } catch(e) { await client.query('ROLLBACK'); console.error(e.message); process.exit(1); }
  finally { client.release(); await pool.end(); }
})();
