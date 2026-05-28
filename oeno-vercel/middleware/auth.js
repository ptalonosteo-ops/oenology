'use strict';
const crypto = require('crypto');
const sessions = new Map();
const TTL = 7 * 24 * 3600 * 1000;
const createSession  = () => { const t = crypto.randomUUID(); sessions.set(t, Date.now()+TTL); return t; };
const destroySession = t => sessions.delete(t);
const validToken     = t => { if(!t) return false; const e=sessions.get(t); if(!e) return false; if(Date.now()>e){sessions.delete(t);return false;} return true; };
function parseCookies(req) {
  const out={}; (req.headers?.cookie||'').split(';').forEach(c=>{const[k,...v]=c.trim().split('=');if(k)out[k.trim()]=decodeURIComponent(v.join('='));}); return out;
}
function requireAdmin(req, res, next) {
  if(validToken(req.cookies?.oeno_admin)) return next();
  if(req.path.startsWith('/api/')) return res.status(401).json({error:'Non authentifié'});
  res.redirect('/admin/login.html');
}
const checkPassword = p => p === (process.env.ADMIN_PASSWORD || 'admin');
module.exports = { createSession, destroySession, requireAdmin, checkPassword, parseCookies };
