// Partagé entre toutes les pages admin
const API = {
  async get(url) { const r = await fetch(url); if(!r.ok) throw await r.json(); return r.json(); },
  async post(url,data) { const r = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); if(!r.ok) throw await r.json(); return r.json(); },
  async put(url,data)  { const r = await fetch(url,{method:'PUT', headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); if(!r.ok) throw await r.json(); return r.json(); },
  async del(url)       { const r = await fetch(url,{method:'DELETE'}); if(!r.ok) throw await r.json(); return r.json(); },
};

function toast(msg, type='ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(()=>t.remove(),300); }, 3000);
}

async function logout() {
  await API.post('/admin/logout',{});
  location.href = '/admin/login';
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function nav(links) {
  return `<nav>
    <a href="/admin/" class="${location.pathname=='/admin/'||location.pathname=='/admin/index.html'?'active':''}">🏠 Tableau de bord</a>
    <a href="/admin/cepages.html" class="${location.pathname.includes('cepage')?'active':''}">🍇 Cépages</a>
    <a href="/admin/geologie.html" class="${location.pathname.includes('geolo')?'active':''}">🪨 Géologie</a>
    <a href="/admin/terroirs.html" class="${location.pathname.includes('terroir')?'active':''}">🗺️ Terroirs</a>
    <a href="/admin/exercices.html" class="${location.pathname.includes('exercice')?'active':''}">📝 Exercices</a>
    <button onclick="logout()" class="logout-btn">Déconnexion</button>
  </nav>`;
}

const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f0ea;color:#1a1710;min-height:100vh}
  nav{background:#1a0a0a;display:flex;align-items:center;gap:4px;padding:0 20px;flex-wrap:wrap;min-height:52px}
  nav a{color:#d4b896;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:13.5px;font-weight:500;transition:background .15s}
  nav a:hover{background:#fff1;color:#fff}
  nav a.active{background:#8b1a1a;color:#fff}
  .logout-btn{margin-left:auto;background:none;border:1px solid #ffffff44;color:#d4b896;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px}
  .logout-btn:hover{background:#fff1}
  main{max-width:1100px;margin:0 auto;padding:28px 20px}
  h1{font-size:24px;color:#1a1710;margin-bottom:6px}
  .sub{color:#6b6458;font-size:14px;margin-bottom:28px}
  .card{background:#fff;border-radius:12px;border:1px solid #e5e0d5;overflow:hidden;margin-bottom:20px}
  .card-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #f0ece5}
  .card-hd h2{font-size:15px;font-weight:600;color:#1a1710}
  .card-body{padding:20px}
  table{width:100%;border-collapse:collapse;font-size:13.5px}
  th{text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b6458;border-bottom:2px solid #e5e0d5}
  td{padding:10px 12px;border-bottom:1px solid #f0ece5;vertical-align:middle}
  tr:hover td{background:#faf8f5}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
  .badge-fr{background:#e8f4f0;color:#1a6b4a}
  .badge-monde{background:#eff6ff;color:#1e40af}
  .btn{display:inline-flex;align-items:center;gap:5px;padding:8px 14px;border-radius:7px;font-size:13px;font-weight:600;border:none;cursor:pointer;transition:all .15s}
  .btn-primary{background:#8b1a1a;color:#fff}.btn-primary:hover{background:#6b1414}
  .btn-secondary{background:#f0ece5;color:#1a1710}.btn-secondary:hover{background:#e5e0d5}
  .btn-danger{background:#fee;color:#8b1a1a;border:1px solid #fcc}.btn-danger:hover{background:#fcc}
  .btn-sm{padding:5px 10px;font-size:12px}
  label{display:block;font-size:12px;font-weight:600;color:#4a4035;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;margin-top:14px}
  label:first-child{margin-top:0}
  input[type=text],input[type=number],select,textarea{width:100%;padding:9px 12px;border:1.5px solid #e5e0d5;border-radius:7px;font-size:14px;font-family:inherit;outline:none;transition:border .15s;background:#fff}
  input:focus,select:focus,textarea:focus{border-color:#8b1a1a}
  textarea{resize:vertical;min-height:100px;line-height:1.6}
  textarea.tall{min-height:160px}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .form-row-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
  .modal-bg{display:none;position:fixed;inset:0;background:#0008;z-index:100;overflow-y:auto;padding:40px 20px}
  .modal-bg.open{display:flex;align-items:flex-start;justify-content:center}
  .modal{background:#fff;border-radius:16px;width:100%;max-width:720px;padding:28px;position:relative}
  .modal-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
  .modal-hd h2{font-size:18px;font-weight:700}
  .close-btn{background:none;border:none;font-size:22px;cursor:pointer;color:#6b6458;line-height:1}
  .close-btn:hover{color:#1a1710}
  .tabs{display:flex;gap:2px;background:#f0ece5;border-radius:8px;padding:3px;margin-bottom:16px;flex-wrap:wrap}
  .tab{flex:1;padding:7px 10px;border:none;background:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;color:#6b6458;transition:all .15s;min-width:80px;text-align:center}
  .tab.active{background:#fff;color:#8b1a1a;box-shadow:0 1px 3px rgba(0,0,0,.1)}
  .toast{position:fixed;bottom:24px;right:24px;background:#1a1710;color:#fff;padding:12px 18px;border-radius:8px;font-size:14px;transform:translateY(80px);opacity:0;transition:all .25s;z-index:999}
  .toast.show{transform:translateY(0);opacity:1}
  .toast.error{background:#8b1a1a}
  .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
  .stat{background:#fff;border:1px solid #e5e0d5;border-radius:12px;padding:20px;text-align:center}
  .stat-n{font-size:36px;font-weight:700;color:#8b1a1a}
  .stat-l{font-size:12px;color:#6b6458;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
  .search-bar{padding:9px 12px 9px 36px;border:1.5px solid #e5e0d5;border-radius:7px;font-size:14px;outline:none;width:260px;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%239a9080'%3E%3Cpath fill-rule='evenodd' d='M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z'/%3E%3C/svg%3E") no-repeat 10px center/16px}
  .months-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:4px}
  .months-grid input{padding:5px 4px;font-size:12px;text-align:center;min-width:0}
  .month-label{font-size:10px;text-align:center;color:#6b6458;font-weight:600}
  .structure-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:4px}
  .structure-grid input[type=number]{padding:7px 8px;font-size:13px}
  .tip{font-size:11px;color:#9a9080;margin-top:3px;font-style:italic}
  .empty{text-align:center;padding:40px;color:#9a9080;font-size:14px}
`;
