'use strict';
const router = require('express').Router();
const { query, pool } = require('../db');
const path = require('path');
const fs   = require('fs');

// ── Données de référence lues depuis data.json ──────────────────────────────
let _data = null;
function loadData() {
  if (_data) return _data;
  try {
    const dataFile = path.join(__dirname, '..', 'data.json');
    _data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch(e) { _data = { cepages: [], geo_soils: [] }; }
  return _data;
}

// Champs supplémentaires des cépages (icon, type, rose, structure, etc.)
let _extras = null;
function getCepageExtras() {
  if (_extras) return _extras;
  _extras = {};
  for (const c of (loadData().cepages || [])) {
    _extras[c.id] = {
      icon:          c.icon          || '🍇',
      type:          c.type          || '',
      rose:          c.rose          === true,
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
  return _extras;
}

// Géologie de référence (data.json) au format app : {cepage_id:{fr:[],monde:[]}}
let _geoJSON = null;
function getGeoFromJSON() {
  if (_geoJSON) return _geoJSON;
  _geoJSON = {};
  for (const s of (loadData().geo_soils || [])) {
    if (!_geoJSON[s.cepage_id]) _geoJSON[s.cepage_id] = {fr:[],monde:[]};
    const pays = s.pays === 'monde' ? 'monde' : 'fr';
    _geoJSON[s.cepage_id][pays].push({
      n:s.nom, r:s.region, a:s.age, d:s.description,
      s:s.structure||{}, ar:s.aromes||[], k:s.key_point||'', fiche:s.fiche||{}
    });
  }
  return _geoJSON;
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

    // Géologie : on part de data.json (référence complète = 90 sols),
    // puis on remplace par la base pour les cépages qui y ont des sols
    // (préserve les éventuelles éditions faites via l'admin).
    const geo = JSON.parse(JSON.stringify(getGeoFromJSON()));
    const cepsWithDbGeo = new Set(s.rows.map(r => r.cepage_id));
    for (const cid of cepsWithDbGeo) geo[cid] = {fr:[],monde:[]};
    for (const r of s.rows) {
      if (!geo[r.cepage_id]) geo[r.cepage_id] = {fr:[],monde:[]};
      const pays = r.pays === 'monde' ? 'monde' : 'fr';
      geo[r.cepage_id][pays].push({
        n:r.nom, r:r.region, a:r.age, d:r.description,
        s:r.structure||{}, ar:r.aromes||[], k:r.key_point||'', fiche:r.fiche||{}
      });
    }

    // Cépages : DB + champs supplémentaires de data.json (dont rose)
    const cepages = c.rows.map(cep => ({
      ...(extras[cep.id] || {}),
      ...cep,
      rose:      (extras[cep.id]||{}).rose === true,
      structure: (extras[cep.id]||{}).structure || {a:50,t:50,c:50,g:50},
    }));

    res.json({
      cepages,
      geo,
      exos: e.rows.map(e=>({...e, cepages:e.cepages||[], ai:!!e.ai}))
    });
  } catch(e){res.status(500).json({error:e.message});}
});

router.post('/data', (req, res) => {
  // L'application publique renvoie ses données au chargement.
  // On NE réécrit PLUS la base ici : le contenu de référence vient de data.json
  // (via GET /data). Cela évite qu'un cache navigateur écrase la base.
  // Les modifications de contenu passent uniquement par le panneau /admin.
  res.json({ ok: true, ignored: true });
});

router.get('/status',(req,res)=>res.json({ok:true,version:'5.3.0'}));
module.exports = router;
