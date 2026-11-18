
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
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    await client.query('BEGIN');

    // 1. Cépages : ajout des manquants, sans écraser les existants
    let addedCep = 0;
    for (const c of (data.cepages||[])) {
      const r = await client.query(
        `INSERT INTO cepages(id,name,famille,origine,description,color,aromes,sols,notes)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING`,
        [c.id,c.name,c.famille||'',c.origine||'',c.description||'',c.color||'#8b7355',
         JSON.stringify(c.aromes||[]),JSON.stringify(c.sols||[]),c.notes||'']);
      if (r.rowCount > 0) addedCep++;
    }
    console.log(`✓ Cépages : ${addedCep} ajouté(s), ${(data.cepages||[]).length - addedCep} déjà présent(s).`);

    // 2. Géologie : pour chaque cépage SANS sol en base, on insère ses sols
    const soilsByCep = {};
    for (const s of (data.geo_soils||[])) {
      (soilsByCep[s.cepage_id] = soilsByCep[s.cepage_id] || []).push(s);
    }
    let addedSoils = 0;
    for (const [cid, soils] of Object.entries(soilsByCep)) {
      const exists = await client.query('SELECT COUNT(*)::int AS n FROM geo_soils WHERE cepage_id=$1', [cid]);
      if (exists.rows[0].n > 0) continue;
      for (const s of soils) {
        await client.query(
          `INSERT INTO geo_soils(cepage_id,pays,sort_order,nom,region,age,description,structure,aromes,key_point,fiche)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [s.cepage_id,s.pays,s.sort_order,s.nom||'',s.region||'',s.age||'',s.description||'',
           JSON.stringify(s.structure||{}),JSON.stringify(s.aromes||[]),s.key_point||'',JSON.stringify(s.fiche||{})]);
        addedSoils++;
      }
    }
    console.log(`✓ Sols géologiques : ${addedSoils} ajouté(s) pour les nouveaux cépages.`);

    // 3. Exercices : ajout des manquants
    for (let i=0; i<(data.exos||[]).length; i++) {
      const e=data.exos[i];
      await client.query(
        `INSERT INTO exos(id,titre,type,niveau,cepages,ai,statut,description,sort_order)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING`,
        [e.id,e.titre||'',e.type||'',e.niveau||'',JSON.stringify(e.cepages||[]),
         !!e.ai,e.statut||'actif',e.description||'',i]);
    }

    await client.query('COMMIT');
    console.log('✓ Import terminé.');
  } catch(e) { await client.query('ROLLBACK'); console.error('Seed error:', e.message); process.exit(1); }
  finally { client.release(); await pool.end(); }
})();
