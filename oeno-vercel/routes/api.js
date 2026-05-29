'use strict';
const router = require('express').Router();
const { query, pool } = require('../db');
const path = require('path');
const fs   = require('fs');

// Champs supplémentaires des cépages (icon, type, structure, etc.)
// stockés dans data.json car absents de la DB
let _extras = null;
function getCepageExtras() {
  if (_extras) return _extras;
  try {
    const dataFile = path.join(__dirname, '..', 'data.json');
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    _extras = {};
    for (const c of (data.cepages || [])) {
      _extras[c.id] = {
        icon:          c.icon          || '🍇',
        type:          c.type          || '',
        structure:     c.structure     || {a:50,t:50,c:50,g:50},
        terroirs_fr:   c.terroirs_fr   || [],
        terroirs_monde:c.terroirs_monde|| [],
        accords:       c.accords       || [],
        key_point:     c.key_point     || '',
        niveau:        c.niveau        || '',
        exercice:      c.exercice      || false,
        sols:          c.sols          || [],
        color:         c.color         || '#8b7355',
      };
    }
  } catch(e) { _extras = {}; }
  return _extras;
}

router.get('/data', async (req, res) => {
  try {
    const [c,s,e] = await Promise.all([
      query('SELECT * FROM cepages ORDER BY name'),
      query('SELECT * FROM geo_soils ORDER BY cepage_id,pays,sort_order'),
      query('SELECT * FROM exos ORDER BY sort_order,id'),
    ]);
    if (!c.rows.length) return res.status(404).json({error:'Base vide'});

    const extras = getCepageExtras();
    const geo = {};
    for (const r of s.rows) {
      if (!geo[r.cepage_id]) geo[r.cepage_id] = {fr:[],monde:[]};
      geo[r.cepage_id][r.pays].push({
        n:r.nom, r:r.region, a:r.age, d:r.description,
        s:r.structure||{}, ar:r.aromes||[], k:r.key_point||'', fiche:r.fiche||{}
      });
    }

    // Fusionner les champs DB + champs supplémentaires de data.json
    const cepages = c.rows.map(cep => ({
      ...(extras[cep.id] || {}),   // icon, type, structure, etc.
      ...cep,                       // id, name, famille, description, etc. (DB prime)
      structure: (extras[cep.id]||{}).structure || {a:50,t:50,c:50,g:50},
    }));

    res.json({
      cepages,
      geo,
      exos: e.rows.map(e=>({...e, cepages:e.cepages||[], ai:!!e.ai}))
    });
  } catch(e){res.status(500).json({error:e.message});}
});

router.post('/data', async (req, res) => {
  if (!req.body?.cepages) return res.status(400).json({error:'Données invalides'});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {cepages=[],geo={},exos=[]} = req.body;
    const ids = cepages.map(c=>c.id);
    if (ids.length) await client.query('DELETE FROM cepages WHERE id<>ALL($1::text[])',[ids]);
    for (const c of cepages) {
      await client.query(`INSERT INTO cepages(id,name,famille,origine,description,color,aromes,sols,notes)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET
        name=$2,famille=$3,origine=$4,description=$5,color=$6,aromes=$7,sols=$8,notes=$9`,
        [c.id,c.name,c.famille||'',c.origine||'',c.description||'',c.color||'#8b7355',
         JSON.stringify(c.aromes||[]),JSON.stringify(c.sols||[]),c.notes||'']);
    }
    await client.query('DELETE FROM geo_soils');
    for (const [cid,gd] of Object.entries(geo)) for (const pays of ['fr','monde'])
      (gd[pays]||[]).forEach((s,i)=>client.query(
        `INSERT INTO geo_soils(cepage_id,pays,sort_order,nom,region,age,description,structure,aromes,key_point,fiche)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [cid,pays,i,s.n,s.r,s.a,s.d,JSON.stringify(s.s||{}),JSON.stringify(s.ar||[]),s.k,JSON.stringify(s.fiche||{})]));
    await client.query('DELETE FROM exos');
    exos.forEach((e,i)=>client.query(
      `INSERT INTO exos(id,titre,type,niveau,cepages,ai,statut,description,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [e.id,e.titre,e.type,e.niveau,JSON.stringify(e.cepages||[]),!!e.ai,e.statut||'actif',e.description||'',i]));
    await client.query('COMMIT');
    res.json({ok:true,savedAt:new Date().toISOString()});
  } catch(e){await client.query('ROLLBACK');res.status(500).json({error:e.message});}
  finally{client.release();}
});

router.get('/status',(req,res)=>res.json({ok:true,version:'5.1.0'}));
module.exports = router;
