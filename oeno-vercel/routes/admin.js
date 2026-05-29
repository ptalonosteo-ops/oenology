'use strict';
const router = require('express').Router();
const { query, pool } = require('../db');
const { requireAdmin, createSession, destroySession, checkPassword } = require('../middleware/auth');

router.post('/login',(req,res)=>{
  if(checkPassword(req.body.password)){const t=createSession();res.cookie('oeno_admin',t,{httpOnly:true,sameSite:'lax',maxAge:7*24*3600*1000});return res.json({ok:true});}
  res.status(401).json({error:'Mot de passe incorrect'});
});
router.post('/logout',(req,res)=>{destroySession(req.cookies?.oeno_admin);res.clearCookie('oeno_admin');res.json({ok:true});});
router.get(/\.(html|js|css)$/, (_req, _res, next) => next('router'));router.use(requireAdmin);

router.get('/api/stats',async(req,res)=>{
  const {rows}=await query(`SELECT (SELECT COUNT(*)::int FROM cepages) cepages,(SELECT COUNT(*)::int FROM geo_soils) soils,(SELECT COUNT(*)::int FROM terroirs) terroirs,(SELECT COUNT(*)::int FROM exos) exos`);
  res.json(rows[0]);
});

// CÉPAGES
router.get('/api/cepages',async(req,res)=>{const{rows}=await query('SELECT * FROM cepages ORDER BY name');res.json(rows);});
router.get('/api/cepages/:id',async(req,res)=>{const{rows}=await query('SELECT * FROM cepages WHERE id=$1',[req.params.id]);rows.length?res.json(rows[0]):res.status(404).json({error:'Introuvable'});});
router.post('/api/cepages',async(req,res)=>{
  const c=req.body;if(!c.id||!c.name)return res.status(400).json({error:'id et name requis'});
  try{await query(`INSERT INTO cepages(id,name,famille,origine,description,color,aromes,sols,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [c.id,c.name,c.famille||'',c.origine||'',c.description||'',c.color||'#8b7355',JSON.stringify(c.aromes||[]),JSON.stringify(c.sols||[]),c.notes||'']);
  res.status(201).json({ok:true});}catch(e){res.status(400).json({error:e.message});}
});
router.put('/api/cepages/:id',async(req,res)=>{
  const c=req.body;const{rowCount}=await query(`UPDATE cepages SET name=$2,famille=$3,origine=$4,description=$5,color=$6,aromes=$7,sols=$8,notes=$9 WHERE id=$1`,
    [req.params.id,c.name,c.famille||'',c.origine||'',c.description||'',c.color||'#8b7355',JSON.stringify(c.aromes||[]),JSON.stringify(c.sols||[]),c.notes||'']);
  rowCount?res.json({ok:true}):res.status(404).json({error:'Introuvable'});
});
router.delete('/api/cepages/:id',async(req,res)=>{const{rowCount}=await query('DELETE FROM cepages WHERE id=$1',[req.params.id]);rowCount?res.json({ok:true}):res.status(404).json({error:'Introuvable'});});

// GÉOLOGIE
router.get('/api/geo',async(req,res)=>{
  let sql='SELECT * FROM geo_soils WHERE 1=1';const p=[];
  if(req.query.cepage){p.push(req.query.cepage);sql+=` AND cepage_id=$${p.length}`;}
  if(req.query.pays){p.push(req.query.pays);sql+=` AND pays=$${p.length}`;}
  const{rows}=await query(sql+' ORDER BY cepage_id,pays,sort_order',p);
  res.json(rows.map(s=>({...s,structure:s.structure||{},aromes:s.aromes||[],fiche:s.fiche||{}})));
});
router.get('/api/geo/:id',async(req,res)=>{const{rows}=await query('SELECT * FROM geo_soils WHERE id=$1',[req.params.id]);rows.length?res.json({...rows[0],structure:rows[0].structure||{},aromes:rows[0].aromes||[],fiche:rows[0].fiche||{}}):res.status(404).json({error:'Introuvable'});});
router.post('/api/geo',async(req,res)=>{
  const s=req.body;
  const{rows:mr}=await query('SELECT COALESCE(MAX(sort_order)+1,0) AS n FROM geo_soils WHERE cepage_id=$1 AND pays=$2',[s.cepage_id,s.pays||'fr']);
  const{rows}=await query(`INSERT INTO geo_soils(cepage_id,pays,sort_order,nom,region,age,description,structure,aromes,key_point,fiche) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [s.cepage_id,s.pays||'fr',mr[0].n,s.nom||'',s.region||'',s.age||'',s.description||'',JSON.stringify(s.structure||{}),JSON.stringify(s.aromes||[]),s.key_point||'',JSON.stringify(s.fiche||{})]);
  res.status(201).json({ok:true,id:rows[0].id});
});
router.put('/api/geo/:id',async(req,res)=>{
  const s=req.body;const{rowCount}=await query(`UPDATE geo_soils SET nom=$2,region=$3,age=$4,description=$5,structure=$6,aromes=$7,key_point=$8,fiche=$9 WHERE id=$1`,
    [req.params.id,s.nom||'',s.region||'',s.age||'',s.description||'',JSON.stringify(s.structure||{}),JSON.stringify(s.aromes||[]),s.key_point||'',JSON.stringify(s.fiche||{})]);
  rowCount?res.json({ok:true}):res.status(404).json({error:'Introuvable'});
});
router.delete('/api/geo/:id',async(req,res)=>{const{rowCount}=await query('DELETE FROM geo_soils WHERE id=$1',[req.params.id]);rowCount?res.json({ok:true}):res.status(404).json({error:'Introuvable'});});

// TERROIRS
router.get('/api/terroirs',async(req,res)=>{const{rows}=await query('SELECT * FROM terroirs ORDER BY pays,name');res.json(rows);});
router.get('/api/terroirs/:id',async(req,res)=>{const{rows}=await query('SELECT * FROM terroirs WHERE id=$1',[req.params.id]);rows.length?res.json(rows[0]):res.status(404).json({error:'Introuvable'});});
router.post('/api/terroirs',async(req,res)=>{
  const t=req.body;if(!t.id||!t.name)return res.status(400).json({error:'id et name requis'});
  try{await query(`INSERT INTO terroirs(id,name,region,cepage_id,pays,superficie,altitude,orientation,clim,sol,ensoleillement,gel,temperatures,precipitations,coupe,appellations,key_point,geo_text,hist_text,map_pos) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [t.id,t.name,t.region||'',t.cepage_id||null,t.pays||'fr',t.superficie||'',t.altitude||'',t.orientation||'',t.clim||'',t.sol||'',t.ensoleillement||'',t.gel||'',
     JSON.stringify(t.temperatures||[]),JSON.stringify(t.precipitations||[]),JSON.stringify(t.coupe||{}),JSON.stringify(t.appellations||[]),t.key_point||'',t.geo_text||'',t.hist_text||'',JSON.stringify(t.map_pos||[0,0])]);
  res.status(201).json({ok:true});}catch(e){res.status(400).json({error:e.message});}
});
router.put('/api/terroirs/:id',async(req,res)=>{
  const t=req.body;const{rowCount}=await query(`UPDATE terroirs SET name=$2,region=$3,cepage_id=$4,pays=$5,superficie=$6,altitude=$7,orientation=$8,clim=$9,sol=$10,ensoleillement=$11,gel=$12,temperatures=$13,precipitations=$14,coupe=$15,appellations=$16,key_point=$17,geo_text=$18,hist_text=$19,map_pos=$20 WHERE id=$1`,
    [req.params.id,t.name,t.region||'',t.cepage_id||null,t.pays||'fr',t.superficie||'',t.altitude||'',t.orientation||'',t.clim||'',t.sol||'',t.ensoleillement||'',t.gel||'',
     JSON.stringify(t.temperatures||[]),JSON.stringify(t.precipitations||[]),JSON.stringify(t.coupe||{}),JSON.stringify(t.appellations||[]),t.key_point||'',t.geo_text||'',t.hist_text||'',JSON.stringify(t.map_pos||[0,0])]);
  rowCount?res.json({ok:true}):res.status(404).json({error:'Introuvable'});
});
router.delete('/api/terroirs/:id',async(req,res)=>{const{rowCount}=await query('DELETE FROM terroirs WHERE id=$1',[req.params.id]);rowCount?res.json({ok:true}):res.status(404).json({error:'Introuvable'});});

// EXERCICES
router.get('/api/exos',async(req,res)=>{const{rows}=await query('SELECT * FROM exos ORDER BY sort_order,id');res.json(rows.map(e=>({...e,cepages:e.cepages||[],ai:!!e.ai})));});
router.post('/api/exos',async(req,res)=>{
  const e=req.body;if(!e.id)return res.status(400).json({error:'id requis'});
  const{rows:mr}=await query('SELECT COALESCE(MAX(sort_order)+1,0) AS n FROM exos');
  try{await query(`INSERT INTO exos(id,titre,type,niveau,cepages,ai,statut,description,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [e.id,e.titre||'',e.type||'',e.niveau||'',JSON.stringify(e.cepages||[]),!!e.ai,e.statut||'actif',e.description||'',mr[0].n]);
  res.status(201).json({ok:true});}catch(e2){res.status(400).json({error:e2.message});}
});
router.put('/api/exos/:id',async(req,res)=>{
  const e=req.body;const{rowCount}=await query(`UPDATE exos SET titre=$2,type=$3,niveau=$4,cepages=$5,ai=$6,statut=$7,description=$8 WHERE id=$1`,
    [req.params.id,e.titre||'',e.type||'',e.niveau||'',JSON.stringify(e.cepages||[]),!!e.ai,e.statut||'actif',e.description||'']);
  rowCount?res.json({ok:true}):res.status(404).json({error:'Introuvable'});
});
router.delete('/api/exos/:id',async(req,res)=>{const{rowCount}=await query('DELETE FROM exos WHERE id=$1',[req.params.id]);rowCount?res.json({ok:true}):res.status(404).json({error:'Introuvable'});});

router.get('/api/export',async(req,res)=>{
  const[c,s,e,t]=await Promise.all([query('SELECT * FROM cepages'),query('SELECT * FROM geo_soils ORDER BY cepage_id,pays,sort_order'),query('SELECT * FROM exos ORDER BY sort_order'),query('SELECT * FROM terroirs')]);
  res.setHeader('Content-Disposition','attachment; filename="export.json"');
  res.json({cepages:c.rows,geo_soils:s.rows,exos:e.rows,terroirs:t.rows,exportedAt:new Date()});
});

module.exports = router;
