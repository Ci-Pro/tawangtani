export const ADMIN_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin TAWANGTANI</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif}
body{background:#0f172a;color:#e2e8f0;min-height:100vh;padding:24px}
.wrap{max-width:1100px;margin:0 auto}
h1{font-size:22px;margin-bottom:4px}
.sub{color:#94a3b8;font-size:13px;margin-bottom:20px}
.card{background:#1e293b;border-radius:12px;padding:18px;margin-bottom:16px}
input,select,button{font-size:14px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;padding:8px 12px}
button{cursor:pointer;background:#166534;border-color:#166534}
button:hover{filter:brightness(1.15)}
button.red{background:#991b1b;border-color:#991b1b}
button.gray{background:#334155;border-color:#334155}
.tabs{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.tabs button.on{background:#22c55e;border-color:#22c55e;color:#052e16;font-weight:700}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}
.stat{text-align:center;padding:14px 6px}
.stat .n{font-size:26px;font-weight:800;color:#4ade80}
.stat .l{font-size:12px;color:#94a3b8;margin-top:4px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{color:#94a3b8;text-align:left;padding:8px;border-bottom:1px solid #334155}
td{padding:8px;border-bottom:1px solid #1e293b;vertical-align:top}
.badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700}
.b-pend{background:#854d0e;color:#fef08a}.b-app{background:#14532d;color:#bbf7d0}.b-rej{background:#7f1d1d;color:#fecaca}
.row-actions{display:flex;gap:6px;flex-wrap:wrap}
#msg{position:fixed;top:14px;right:14px;background:#166534;padding:10px 16px;border-radius:10px;display:none;z-index:9;font-size:13px}
.hidden{display:none}
.muted{color:#94a3b8;font-size:12px}
.searchrow{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
</style>
</head>
<body>
<div class="wrap">
<h1>Panel Admin TAWANGTANI</h1>
<div class="sub">Moderasi laporan petani, ringkasan data, dan katalog produk</div>
<div id="gate" class="card">
  <div style="margin-bottom:10px;font-weight:700">Masukkan Admin Token</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <input id="tok" type="password" placeholder="ADMIN_TOKEN" style="min-width:260px">
    <button onclick="saveTok()">Masuk</button>
  </div>
</div>
<div id="app" class="hidden">
  <div class="tabs">
    <button id="t-sum" class="on" onclick="tab('sum')">Ringkasan</button>
    <button id="t-mod" onclick="tab('mod')">Moderasi Laporan</button>
    <button id="t-kat" onclick="tab('kat')">Katalog Produk</button>
    <button id="t-hea" onclick="tab('hea')">Sinkron Harga</button>
    <button id="t-ai" onclick="tab('ai')">Log AI</button>
    <button id="t-sys" onclick="tab('sys')">Sistem</button>
    <button class="gray" onclick="logout()">Keluar</button>
  </div>

  <div id="p-sum">
    <div class="card stats" id="stats"><div class="muted">Memuat...</div></div>
  </div>

  <div id="p-mod" class="hidden">
    <div class="searchrow">
      <select id="fstat" onchange="loadMod()">
        <option value="pending">Menunggu</option>
        <option value="approved">Disetujui</option>
        <option value="rejected">Ditolak</option>
        <option value="">Semua</option>
      </select>
      <span class="muted" id="modcount"></span>
    </div>
    <div class="card" style="overflow-x:auto"><table id="tbl-mod"></table></div>
  </div>

  <div id="p-kat" class="hidden">
    <div class="searchrow"><input id="qkat" placeholder="Cari produk..." oninput="renderKat()"><span class="muted" id="katcount"></span></div>
    <div class="card" style="overflow-x:auto"><table id="tbl-kat"></table></div>
  </div>

  <div id="p-hea" class="hidden"></div>
  <div id="p-ai" class="hidden"></div>
  <div id="p-sys" class="hidden"></div>
</div>
</div>
<div id="msg"></div>
<script>
var TOK = localStorage.getItem('twt_admin_token') || '';
var PRODUCTS = [];
function $(id){return document.getElementById(id)}
function toast(t){var m=$('msg');m.textContent=t;m.style.display='block';setTimeout(function(){m.style.display='none'},2500)}
function api(path,opts){
  opts=opts||{};
  opts.headers=Object.assign({'x-admin-token':TOK,'Content-Type':'application/json'},opts.headers||{});
  return fetch('/api/admin'+path,opts).then(function(r){
    if(r.status===403) throw new Error('Token tidak valid');
    return r.json();
  });
}
function saveTok(){TOK=$('tok').value.trim();if(!TOK)return;localStorage.setItem('twt_admin_token',TOK);init()}
function logout(){localStorage.removeItem('twt_admin_token');location.reload()}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fmtRp(n){return n?'Rp'+Number(n).toLocaleString('id-ID'):'-'}
function fmtTgl(s){return s?new Date(s).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'}):'-'}
function fmtN(n){return n==null?'-':Number(n).toLocaleString('id-ID')}
function timeAgo(s){
  if(!s)return '-';
  var ms=Date.now()-new Date(s).getTime();
  if(ms<0)return 'baru saja';
  var m=Math.floor(ms/60000);
  if(m<60)return m+' mnt lalu';
  var h=Math.floor(m/60);
  if(h<24)return h+' jam lalu';
  return Math.floor(h/24)+' hari lalu';
}

function tab(k){
  ['sum','mod','kat','hea','ai','sys'].forEach(function(x){
    $('p-'+x).className=x===k?'':'hidden';
    $('t-'+x).className=x===k?'on':'';
  });
  if(k==='sum') loadSum();
  if(k==='mod') loadMod();
  if(k==='kat') loadKat();
  if(k==='hea') loadHealth();
  if(k==='ai') loadAi();
  if(k==='sys') loadSys();
}

function init(){
  $('gate').classList.add('hidden');
  $('app').classList.remove('hidden');
  tab('sum');
}

function loadSum(){
  api('/summary').then(function(s){
    var items=[['Produk katalog',s.products],['Laporan pending',s.farmerPending],['Laporan approved',s.farmerApproved],['Alarm harga',s.alerts],['Tanamanku',s.plantings],['Query AI (7 hari)',s.aiQueries7d],['Chunk KB',s.kbChunks]];
    $('stats').innerHTML=items.map(function(x){
      return '<div class="card stat" style="margin:0"><div class="n">'+esc(x[1])+'</div><div class="l">'+esc(x[0])+'</div></div>';
    }).join('');
  }).catch(function(e){$('stats').innerHTML='<div class="muted">'+esc(e.message)+'</div>'});
}

function loadMod(){
  var st=$('fstat').value;
  api('/farmer-prices'+(st?'?status='+st:'')).then(function(d){
    var rows=d.rows||[];
    $('modcount').textContent=rows.length+' laporan';
    var h='<tr><th>Tanggal</th><th>Komoditas</th><th>Harga</th><th>Arah</th><th>Lokasi</th><th>Status</th><th>Aksi</th></tr>';
    rows.forEach(function(r){
      var st=r.status;
      var stc=st==='pending'?'background:#854d0e;color:#fef08a':st==='approved'?'background:#14532d;color:#bbf7d0':'background:#7f1d1d;color:#fecaca';
      h+='<tr><td>'+fmtTgl(r.created_at)+'</td><td>'+esc(r.commodity)+'</td><td>'+fmtRp(r.price)+'/'+esc(r.unit)+'</td>'+
         '<td>'+(r.role==='jual'?'Dijual':'Dibeli')+'</td><td>'+esc(r.village)+', '+esc(r.province)+'</td>'+
         '<td><span class="badge" style="'+stc+'">'+st+'</span></td>'+
         '<td class="row-actions">'+
         (r.status!=='approved'?'<button onclick="mod(\\''+r.id+'\\',\\'approved\\')">Setujui</button>':'')+
         (r.status!=='rejected'?'<button class="red" onclick="mod(\\''+r.id+'\\',\\'rejected\\')">Tolak</button>':'')+
         '<button class="gray" onclick="del(\\''+r.id+'\\')">Hapus</button></td></tr>';
    });
    $('tbl-mod').innerHTML=h;
  }).catch(function(e){toast(e.message)});
}

function mod(id,status){
  api('/farmer-prices/'+encodeURIComponent(id)+'/moderate',{method:'POST',body:JSON.stringify({status:status})})
    .then(function(){toast(status==='approved'?'Disetujui':'Ditolak');loadMod()})
    .catch(function(e){toast(e.message)});
}
function del(id){
  if(!confirm('Hapus permanen laporan ini?'))return;
  api('/farmer-prices/'+encodeURIComponent(id),{method:'DELETE'})
    .then(function(){toast('Terhapus');loadMod()})
    .catch(function(e){toast(e.message)});
}

function loadKat(){
  fetch('/api/products').then(function(r){return r.json()}).then(function(d){
    PRODUCTS=d.products||[];
    $('katcount').textContent=PRODUCTS.length+' produk';
    renderKat();
  });
}
function renderKat(){
  var q=($('qkat').value||'').toLowerCase();
  var rows=PRODUCTS.filter(function(p){
    return !q||JSON.stringify(p).toLowerCase().indexOf(q)>=0;
  }).slice(0,80);
  var h='<tr><th>Produk</th><th>Bahan Aktif</th><th>Bentuk</th><th>Dosis</th></tr>';
  rows.forEach(function(p){
    var doses=(p.doses||[]).map(function(x){return esc(x.crop||x.target||'?')+': '+esc(x.dose||'')+esc(x.unit?' '+x.unit:'')}).join('<br>');
    h+='<tr><td><b>'+esc((p.brand||p.name||'?'))+'</b><br><span class="muted">'+esc(p.manufacturer||'')+'</span></td>'+
       '<td>'+esc(p.activeIngredient||p.active_ingredient||'-')+'</td><td>'+esc(p.formulation||p.form||'-')+'</td><td>'+(doses||'<span class=muted>-</span>')+'</td></tr>';
  });
  $('tbl-kat').innerHTML=h;
}

function statCard(n,l,bad){
  var c='#4ade80';
  if(n==null||n==='-'||n===0)c='#94a3b8';
  else if(bad)c='#f87171';
  return '<div class="card stat" style="margin:0"><div class="n" style="color:'+c+'">'+fmtN(n)+'</div><div class="l">'+esc(l)+'</div></div>';
}

function loadHealth(){
  $('p-hea').innerHTML='<div class="card"><div class="muted">Memuat...</div></div>';
  api('/market-health').then(function(m){
    var sync=m.lastSync, hist=m.lastSnapshot;
    var stale=!(sync&&new Date(sync.updated_at).getTime()>Date.now()-864e5);
    var cards=''+
      statCard(m.marketPrices,'Baris harga aktif')+
      statCard(m.history,'Riwayat harga')+
      statCard(m.nasional,'Nasional (Kemtan)')+
      statCard(m.perProvinsi,'Provinsi (SP2KP)')+
      statCard(m.provinces,'Provinsi unik')+
      statCard(sync?timeAgo(sync.updated_at):'-','Terakhir sinkron'+ (sync?(' · '+esc(sync.source)):''),stale)+
      statCard(hist?hist.date:'-','Snapshot terakhir');
    $('p-hea').innerHTML='<div class="card stats">'+cards+'</div>'+
      (stale?'<div class="card" style="border:1px solid #b45309"><b>Sinkron tampak basi</b> — tidak ada pembaruan data harga dalam 24 jam terakhir. Cek cron SP2KP (edge function <code>sync-kemendag</code>) atau jalankan <code>POST /api/market/refresh</code>.</div>':'');
  }).catch(function(e){$('p-hea').innerHTML='<div class="card"><div class="muted">'+esc(e.message)+'</div></div>'});
}

function loadAi(){
  $('p-ai').innerHTML='<div class="card"><div class="muted">Memuat...</div></div>';
  api('/ai-logs').then(function(d){
    var cards=''+
      statCard(d.total30d,'Query AI (30 hr)')+
      statCard(d.total7d,'Query AI (7 hr)')+
      statCard(d.users30d,'Pengguna (30 hr)')+
      statCard(d.users7d,'Pengguna (7 hr)')+
      statCard(d.promptTokens,'Token input')+
      statCard(d.completionTokens,'Token output')+
      statCard(d.avgLatencyMs,'Latensi rata-rata (ms)');
    var models='<div class="card"><b>Pemakaian per model</b><table><tr><th>Model</th><th>Query</th><th>Token input</th><th>Token output</th></tr>'+
      d.models.map(function(m){
        return '<tr><td>'+esc(m[0])+'</td><td>'+fmtN(m[1].n)+'</td><td>'+fmtN(m[1].prompt)+'</td><td>'+fmtN(m[1].comp)+'</td></tr>';
      }).join('')+'</table></div>';
    var rows=(d.recent||[]).map(function(r){
      var l=Number(r.latency_ms)||0;
      return '<tr><td>'+fmtTgl(r.created_at)+'</td><td>'+esc(String(r.model_used||'?'))+'</td>'+
        '<td>'+fmtN(r.prompt_tokens)+'→'+fmtN(r.completion_tokens)+'</td><td>'+fmtN(l)+' ms</td>'+
        '<td>'+esc(String(r.question||'').slice(0,60))+'</td><td class="muted">'+esc(String(r.user_id||'').slice(0,13))+'</td></tr>';
    }).join('');
    $('p-ai').innerHTML='<div class="card stats">'+cards+'</div>'+models+
      '<div class="card" style="overflow-x:auto"><table><tr><th>Waktu</th><th>Model</th><th>Tokens in→out</th><th>Latensi</th><th>Pertanyaan</th><th>User</th></tr>'+rows+'</table></div>';
  }).catch(function(e){$('p-ai').innerHTML='<div class="card"><div class="muted">'+esc(e.message)+'</div></div>'});
}

function loadSys(){
  $('p-sys').innerHTML='<div class="card"><div class="muted">Memuat...</div></div>';
  api('/meta').then(function(m){
    function envRow(k,ok,note){
      var col=ok?'background:#14532d;color:#bbf7d0':'background:#7f1d1d;color:#fecaca';
      return '<tr><td>'+esc(k)+'</td><td><span class="badge" style="'+col+'">'+(ok?'Terpasang':'Hilang')+'</span>'+(note?' <span class="muted">'+esc(note)+'</span>':'')+'</td></tr>';
    }
    var env='<div class="card"><b>Status env</b><table><tr><th>Kunci</th><th>Status</th></tr>'+
      envRow('GEMINI_API_KEY',m.envSet.geminiApi)+
      envRow('OPENROUTER_API_KEY',m.envSet.openrouterApi)+
      envRow('SUPABASE_URL + SERVICE_ROLE',m.envSet.supabaseService)+
      envRow('ADMIN_TOKEN khusus',m.envSet.adminTokenKhusus,'default dev masih dipakai!')+
      envRow('CRON_SECRET',m.envSet.cronSecret)+
      '</table></div>';
    var models='<div class="card"><b>Model aktif</b><br>'+
      '<span class="muted">LLM utama:</span> '+esc(m.models.llm||'-')+
      (m.models.llmAlt?' &nbsp;·&nbsp; <span class="muted">alt (OpenRouter):</span> '+esc(m.models.llmAlt):'')+
      '<br><span class="muted">Fallback:</span> '+esc((m.models.fallback||[]).join(', '))+'</div>';
    $('p-sys').innerHTML=env+models+
      '<div class="card" style="border:1px solid #334155"><b>Deploy</b><table><tr><th>Commit</th><td>'+esc(m.sha||'-')+'</td></tr>'+
      '<tr><th>Platform</th><td>'+(m.vercel?'Vercel':'Lokal/else')+'</td></tr>'+
      '<tr><th>Node</th><td>'+esc(m.node||'-')+'</td></tr>'+
      '<tr><th>Ping server</th><td>'+fmtTgl(m.ts)+'</td></tr></table></div>';
  }).catch(function(e){$('p-sys').innerHTML='<div class="card"><div class="muted">'+esc(e.message)+'</div></div>'});
}

if(TOK){init()}
</script>
</body>
</html>`;
