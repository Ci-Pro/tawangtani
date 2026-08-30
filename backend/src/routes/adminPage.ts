export const ADMIN_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin TAWANGTANI</title>
<style>
:root{--bg:#0b1220;--panel:#111a2e;--panel2:#182441;--line:#23324f;--txt:#e6edf7;--mut:#8b9bb4;--acc:#22c55e;--warn:#f59e0b;--danger:#ef4444;--info:#38bdf8;--r:12px}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--txt);font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.45;padding-bottom:70px}
.top{position:sticky;top:0;z-index:20;background:var(--panel);border-bottom:1px solid var(--line);padding:12px 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:16px;letter-spacing:.3px}
.dot{width:10px;height:10px;border-radius:50%;background:var(--acc);box-shadow:0 0 10px var(--acc)}
.top .sp{flex:1}
.badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;white-space:nowrap}
.b-ok{background:#14532d;color:#bbf7d0}.b-bad{background:#7f1d1d;color:#fecaca}.b-warn{background:#78350f;color:#fde68a}
.b-info{background:#0c4a6e;color:#bae6fd}.b-mut{background:#1e293b;color:#94a3b8}
.wrap{max-width:1200px;margin:0 auto;padding:20px}
.nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
.nav button{font-size:13px;font-weight:600;padding:8px 14px;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:var(--txt);cursor:pointer}
.nav button:hover{filter:brightness(1.3)}
.nav button.on{background:var(--acc);border-color:var(--acc);color:#052e16;box-shadow:0 0 0 3px rgba(34,197,94,.15)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:18px;margin-bottom:16px}
.card h3{font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:var(--mut);margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.grid{display:grid;gap:12px}
.g2{grid-template-columns:repeat(2,1fr)}
.g3{grid-template-columns:repeat(3,1fr)}
.stats{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.stat{text-align:center;padding:16px 8px;background:var(--panel);border:1px solid var(--line);border-radius:var(--r)}
.stat .n{font-size:24px;font-weight:800;color:var(--acc);margin-bottom:2px}
.stat .l{font-size:12px;color:var(--mut)}
label{display:block;font-size:12px;color:var(--mut);margin:0 0 5px;font-weight:600;letter-spacing:.3px}
input,select,textarea{width:100%;font-size:14px;border-radius:10px;border:1px solid var(--line);background:#0e1730;color:var(--txt);padding:9px 12px;outline:none}
input:focus,select:focus,textarea:focus{border-color:var(--acc)}
textarea{resize:vertical;min-height:80px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:700;padding:9px 16px;border-radius:10px;border:1px solid var(--acc);background:rgba(34,197,94,.15);color:var(--acc);cursor:pointer;white-space:nowrap}
.btn:hover{background:var(--acc);color:#052e16}
.btn.solid{background:var(--acc);color:#052e16}
.btn.warn{border-color:var(--warn);background:rgba(245,158,11,.12);color:var(--warn)}
.btn.warn:hover{background:var(--warn);color:#451a03}
.btn.danger{border-color:var(--danger);background:rgba(239,68,68,.1);color:var(--danger)}
.btn.danger:hover{background:var(--danger);color:#fff}
.btn.ghost{border-color:var(--line);background:var(--panel2);color:var(--txt)}
.btn.ghost:hover{filter:brightness(1.35)}
.btn.sm{padding:5px 10px;font-size:12px;border-radius:8px}
.tbl{overflow-x:auto;border-radius:var(--r);border:1px solid var(--line)}
table{width:100%;border-collapse:collapse;font-size:13px;min-width:640px}
th{color:var(--mut);text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);background:var(--panel2);font-size:11px;text-transform:uppercase;letter-spacing:.5px;position:sticky;top:0}
td{padding:9px 12px;border-bottom:1px solid rgba(35,50,79,.5);vertical-align:top}
tr:hover td{background:rgba(56,189,248,.04)}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.mut{color:var(--mut);font-size:12px}
code{background:#0e1730;border:1px solid var(--line);border-radius:6px;padding:1px 6px;font-size:12px}
.row-actions{display:flex;gap:6px;flex-wrap:wrap}
.toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
.toolbar select,.toolbar .btn{width:auto}
#msg{position:fixed;bottom:20px;right:20px;z-index:50;background:#052e16;color:#bbf7d0;border:1px solid var(--acc);padding:12px 18px;border-radius:12px;display:none;font-size:13px;max-width:80vw;box-shadow:0 8px 30px rgba(0,0,0,.4)}
#msg.err{background:#7f1d1d;border-color:var(--danger);color:#fecaca}
.hidden{display:none}
.alertbox{border:1px solid #b45309;background:rgba(180,83,9,.08);border-radius:var(--r);padding:12px 14px;font-size:13px;margin-bottom:16px}
.alertbox .t{font-weight:700;color:#fde68a}
.kbar{font-size:12px;color:var(--mut)}
input[type=checkbox]{width:16px;height:16px;accent-color:var(--acc)}
.pager{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
.copybtn{cursor:pointer;border:none;background:none;color:var(--info);font-size:11px;text-decoration:underline}
.limitnote{font-size:12px;color:var(--warn);margin-top:6px}
@media(max-width:720px){
 body{font-size:13px}
 .top{padding:10px 14px}
 .wrap{padding:14px}
 .g2,.g3{grid-template-columns:1fr}
 .nav button{flex:1 1 calc(50% - 4px);text-align:center;padding:10px 6px}
 .card{padding:14px}
 .btn{width:100%}
 .toolbar .btn{width:auto}
 .stat .n{font-size:20px}
 #msg{left:20px;right:20px;bottom:14px;max-width:none;text-align:center}
}
@media(max-width:420px){
 .nav button{flex:1 1 100%}
}
</style>
</head>
<body>
<div class="top">
  <div class="brand"><span class="dot"></span>Tawangtani Admin</div>
  <div class="sp"></div>
  <span id="envbadge" class="badge b-mut">menunggu deploy…</span>
  <button class="btn ghost sm" onclick="logout()">Keluar</button>
</div>
<div class="wrap">
<div id="gate" class="card" style="max-width:460px;margin:8vh auto">
  <div style="margin-bottom:10px;font-weight:700">Masukkan Admin Token</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <input id="tok" type="password" placeholder="ADMIN_TOKEN" style="min-width:220px;flex:1">
    <button class="btn solid" onclick="saveTok()">Masuk</button>
  </div>
  <div id="gateinfo" class="mut" style="margin-top:12px"></div>
</div>
<div id="app" class="hidden">
  <div class="nav">
    <button id="t-sum" onclick="tab('sum')">Ringkasan</button>
    <button id="t-mod" onclick="tab('mod')">Moderasi</button>
    <button id="t-psh" onclick="tab('psh')">Notifikasi</button>
    <button id="t-alm" onclick="tab('alm')">Alarm</button>
    <button id="t-dev" onclick="tab('dev')">Perangkat</button>
    <button id="t-kat" onclick="tab('kat')">Katalog</button>
    <button id="t-hea" onclick="tab('hea')">Sinkron</button>
    <button id="t-ai" onclick="tab('ai')">AI Log</button>
    <button id="t-sys" onclick="tab('sys')">Sistem</button>
  </div>

  <div id="p-sum"></div>
  <div id="p-mod" class="hidden"></div>
  <div id="p-psh" class="hidden"></div>
  <div id="p-alm" class="hidden"></div>
  <div id="p-dev" class="hidden"></div>
  <div id="p-kat" class="hidden"></div>
  <div id="p-hea" class="hidden"></div>
  <div id="p-ai" class="hidden"></div>
  <div id="p-sys" class="hidden"></div>
</div>
</div>
<div id="msg"></div>
<script>
var TOK = localStorage.getItem('twt_admin_token') || '';
var SEL = {};
var MODFILTER = 'pending';
var DEV = null;
var DEVACT = 0;
var SRCACHE = {};

function $(id){return document.getElementById(id)}
function toast(t,isErr){var m=$('msg');m.textContent=t;m.className=isErr?'err':'';m.style.display='block';clearTimeout(m._t);m._t=setTimeout(function(){m.style.display='none'},4000)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function escA(s){return esc(s).replace(/"/g,'&quot;')}
function fmtN(n){return n==null?'-':Number(n).toLocaleString('id-ID')}
function fmtRp(n){return n!=null&&n!==''?'Rp'+Number(n).toLocaleString('id-ID'):'-'}
function fmtTgl(s){return s?new Date(s).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'}):'-'}
function timeAgo(s){if(!s)return '-';var ms=Date.now()-new Date(s).getTime();if(ms<0)return 'baru saja';var m=Math.floor(ms/60000);if(m<60)return m+' mnt lalu';var h=Math.floor(m/60);if(h<24)return h+' jam lalu';return Math.floor(h/24)+' hari lalu'}
function stBadge(st){var m={pending:['b-warn','Menunggu'],approved:['b-ok','Disetujui'],rejected:['b-bad','Ditolak']}[st]||['b-mut',st];return '<span class="badge '+m[0]+'">'+esc(m[1])+'</span>'}
function statCard(n,l,bad){var c='var(--acc)';if(n==null||n==='-'||n===0)c='var(--mut)';else if(bad)c='var(--danger)';return '<div class="stat"><div class="n" style="color:'+c+'">'+fmtN(n)+'</div><div class="l">'+esc(l)+'</div></div>'}

function api(path,opts){
  opts=opts||{};
  opts.headers=Object.assign({'x-admin-token':TOK,'Content-Type':'application/json'},opts.headers||{});
  return fetch('/api/admin'+path,opts).then(function(r){
    if(r.status===403){
      toast('Token tidak valid — silakan masuk ulang',true);
      try{localStorage.removeItem('twt_admin_token')}catch(e){}
      setTimeout(function(){location.reload()},1600);
      throw new Error('Token tidak valid');
    }
    if(!r.ok){
      return r.text().then(function(t){
        throw new Error('HTTP '+r.status+(t?': '+String(t).slice(0,120):''));
      });
    }
    return r.json().catch(function(){throw new Error('Respons bukan JSON (HTTP '+r.status+')')});
  });
}
function apiBlob(path){
  return fetch('/api/admin'+path,{headers:{'x-admin-token':TOK}}).then(function(r){
    if(!r.ok){toast('Gagal ekspor (HTTP '+r.status+')',true);throw new Error('HTTP '+r.status)}
    return r.blob();
  });
}
function saveTok(){
  TOK=$('tok').value.trim();
  if(!TOK){toast('Ketik admin token dulu',true);return}
  try{localStorage.setItem('twt_admin_token',TOK)}catch(e){/* penyimpanan diblokir: sesi tetap jalan */}
  gateMsg('Memverifikasi token…');
  api('/summary').then(function(){
    gateMsg('Token valid ✓ — memuat panel…');
    init();
  }).catch(function(e){
    gateMsg('Gagal masuk: '+e.message);
    var gi=$('gateinfo');if(gi)gi.className='mut';
  });
}
function gateMsg(t){var g=$('gateinfo');if(g){g.textContent=t;g.className='mut'}}
function logout(){try{localStorage.removeItem('twt_admin_token')}catch(e){}location.reload()}

function metaBadge(){
  api('/meta').then(function(m){
    var ok=m.envSet.geminiApi&&m.envSet.supabaseService&&m.envSet.adminTokenKhusus;
    var el=$('envbadge');el.className='badge '+(ok?'b-ok':'b-warn');
    el.textContent=ok?('deploy '+m.sha):('env belum lengkap · '+m.sha);
  }).catch(function(){
    var el=$('envbadge');el.className='badge b-bad';el.textContent='tidak terhubung · cek token';
    setTimeout(metaBadge,10000);
  });
}
function init(){
  $('gate').classList.add('hidden');
  $('app').classList.remove('hidden');
  metaBadge();
  tab('sum');
}
function tab(k){
  ['sum','mod','psh','alm','dev','kat','hea','ai','sys'].forEach(function(x){
    $('p-'+x).className=x===k?'':'hidden';
    $('t-'+x).className=x===k?'on':'';
  });
  if(k==='sum') loadSum();
  if(k==='mod') loadMod();
  if(k==='kat') loadKat();
  if(k==='hea') loadHealth();
  if(k==='ai') loadAi();
  if(k==='sys') loadSys();
  if(k==='alm') loadAlerts();
  if(k==='dev') loadDev(DEVACT);
  if(k==='psh') loadPush();
}

/* ------------------------------ Ringkasan ------------------------------ */
function loadSum(){
  $('p-sum').innerHTML='<div class="card"><div class="mut">Memuat…</div></div>';
  api('/summary').then(function(s){
    var cards='<div class="grid stats">'+
      statCard(s.products,'Produk katalog')+
      statCard(s.farmerPending,'Laporan pending')+
      statCard(s.farmerApproved,'Laporan disetujui')+
      statCard(s.alerts,'Alarm harga')+
      statCard(s.plantings,'Tanamanku')+
      statCard(s.aiQueries7d,'Query AI (7 hari)')+
      statCard(s.kbChunks,'Chunk KB')+
      '</div>';
    $('p-sum').innerHTML='<div class="card"><h3>Ringkasan data</h3>'+cards+'</div>';
  }).catch(function(e){toast(e.message,true)});
}

/* ------------------------------ Moderasi ------------------------------- */
function loadMod(){
  $('p-mod').innerHTML='<div class="card"><div class="mut">Memuat…</div></div>';
api('/farmer-prices'+(MODFILTER?'?status='+MODFILTER:'')).then(function(d){
 var rows=d.rows||[];
  var checked=0;
  rows.forEach(function(r){if(SEL[r.id])checked++});
    var toolbar='<div class="card" style="padding:14px"><div class="toolbar">'+
      '<select onchange="MODFILTER=this.value;SEL={};loadMod()">'+
      '<option value="pending"'+(MODFILTER==='pending'?' selected':'')+'>Menunggu</option>'+
      '<option value="approved"'+(MODFILTER==='approved'?' selected':'')+'>Disetujui</option>'+
      '<option value="rejected"'+(MODFILTER==='rejected'?' selected':'')+'>Ditolak</option>'+
      '<option value=""'+(!MODFILTER?' selected':'')+'>Semua</option></select>'+
      '<span class="kbar">'+fmtN(rows.length)+' laporan'+(rows.length?' (ter-filter)':'')+'</span>'+
      '<span id="selcount" class="kbar" style="color:var(--acc);font-weight:700;min-width:70px"></span>'+
      '<div class="sp" style="flex:1"></div>'+
      '<button class="btn solid sm" onclick="setAll(true)">Pilih semua</button>'+
      '<button class="btn sm" onclick="setAll(false)">Bersihkan</button>'+
      '<button id="mod-rej" class="btn warn sm" data-act="bat-rej">Tolak '+checked+'</button>'+
      '<button id="mod-appr" class="btn solid sm" data-act="bat-appr">Setujui '+checked+'</button>'+
      '<button class="btn ghost sm" onclick="exportCsv()">CSV</button>'+
      '</div></div>';
    if(rows.length===0){
      $('p-mod').innerHTML=toolbar+'<div class="card"><div class="mut">Tidak ada laporan pada filter ini.</div></div>';
      return;
    }
    var h='<div class="card" style="padding:0;overflow:hidden"><div class="tbl" style="max-height:70vh"><table>'+
      '<thead><tr><th style="width:32px"><input type="checkbox" '+(checked===rows.length&&rows.length?' checked':'')+' onclick="setAll(this.checked)"></th>'+
      '<th>Tanggal</th><th>Komoditas</th><th>Harga</th><th>Batas wajar</th><th>Arah</th><th>Lokasi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>';
    rows.forEach(function(r){
      var s=r.sanity;
      var wj= s?('<span class="mut">'+fmtRp(s.min)+'–'+fmtRp(s.max)+(s.unit&&s.unit!=='kg'?(' '+esc(s.unit)):'')+'</span>'):'<span class="badge b-mut">tidak dikenal</span>';
      var oos=r.price!=null&&s&&(r.price<s.min||r.price>s.max);
      if(oos)wj='<span class="badge b-warn">di luar wajar!</span> '+wj;
      h+='<tr>'+
        '<td><input type="checkbox" data-id="'+r.id+'"'+(SEL[r.id]?' checked':'')+'></td>'+
        '<td>'+fmtTgl(r.created_at)+(r.moderated_at?'<br><span class="mut">diproses '+timeAgo(r.moderated_at)+'</span>':'')+'</td>'+
        '<td><b>'+esc(r.commodity)+'</b>'+(r.note?'<br><span class="mut">'+esc(r.note.slice(0,60))+'</span>':'')+'</td>'+
        '<td>'+fmtRp(r.price)+'/'+esc(r.unit||'kg')+'</td>'+
        '<td>'+wj+'</td>'+
        '<td>'+(r.role==='jual'?'Dijual':'Dibeli')+'</td>'+
        '<td>'+esc(r.village||'-')+'<br><span class="mut">'+esc(r.province)+'</span></td>'+
        '<td>'+stBadge(r.status)+(r.moderation_note?'<br><span class="mut">'+esc(r.moderation_note.slice(0,60))+'</span>':'')+'</td>'+
        '<td class="row-actions">'+
        (r.status!=='approved'?'<button class="btn solid sm" data-act="appr" data-id="'+r.id+'">Setuju</button>':'')+
        (r.status!=='rejected'?'<button class="btn warn sm" data-act="rej" data-id="'+r.id+'">Tolak</button>':'')+
        '<button class="btn danger sm" data-act="del" data-id="'+r.id+'">Hapus</button></td></tr>';
    });
    h+='</tbody></table></div></div>';
    $('p-mod').innerHTML=toolbar+h;
    syncSelUI();
  }).catch(function(e){toast(e.message,true)});
}
/* Seleksi & aksi bersifat lokal + optimistik: tanpa re-render/fetch per klik */
function selIds(){var a=[];document.querySelectorAll('#p-mod tbody input[data-id]:checked').forEach(function(b){a.push(b.getAttribute('data-id'))});return a}
function syncSelUI(){
  var ids=selIds();
  var s=$('selcount');if(s)s.textContent=ids.length?'('+ids.length+' terpilih)':'';
  var rows=document.querySelectorAll('#p-mod tbody input[data-id]');
  var head=document.querySelector('#p-mod thead input[type=checkbox]');
  if(head&&rows.length)head.checked=(ids.length===rows.length);
  [['mod-appr','Setujui '],['mod-rej','Tolak ']].forEach(function(p){
    var el=$(p[0]);if(el){el.textContent=p[1]+ids.length;el.disabled=(ids.length===0)}
  });
}
function setAll(v){
  document.querySelectorAll('#p-mod tbody input[data-id]').forEach(function(b){b.checked=!!v;SEL[b.getAttribute('data-id')]=!!v});
  syncSelUI();
}
/* Delegasi aksi: tanpa inline onclick berargumen — bebas konflik kutip & ringan */
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-act]');if(!b)return;
  var act=b.getAttribute('data-act'),id=b.getAttribute('data-id')||'',kind=b.getAttribute('data-kind')||'',tok=b.getAttribute('data-tok')||'';
  if(act==='appr')mod(b,id,'approved');
  if(act==='rej')mod(b,id,'rejected');
  if(act==='del')del(b,id);
  if(act==='bat-appr')modBatch('approved',b);
  if(act==='bat-rej')modBatch('rejected',b);
  if(act==='alm-del')delAlert(kind,id);
  if(act==='tok-del')delTok(tok);
});
document.addEventListener('change',function(e){
  var cb=e.target.closest('#p-mod tbody input[data-id]');if(!cb)return;
  SEL[cb.getAttribute('data-id')]=cb.checked;syncSelUI();
});
document.addEventListener('change',function(e){
  var cb=e.target.closest('#p-mod thead input[type=checkbox]');if(!cb)return;
  setAll(cb.checked);
});
function busyOn(el){if(!el)return;el.dataset.orig=el.textContent||'';el.disabled=true;el.textContent='…'}
function busyOff(el){if(!el)return;el.disabled=false;el.textContent=el.dataset.orig||el.textContent}
function mod(el,id,status){
  busyOn(el);
  var note;
  if(status==='rejected'){
    note=window.prompt('Alasan penolakan (opsional, tampil untuk petani nanti):','');
    if(note===null){busyOff(el);return}
  }
  api('/farmer-prices/'+encodeURIComponent(id)+'/moderate',{method:'POST',body:JSON.stringify({status:status,note:note||undefined})})
    .then(function(){toast(status==='approved'?'Disetujui':'Ditolak');loadMod()})
    .catch(function(e){busyOff(el);toast(e.message,true)});
}
function modBatch(status,btn){
  var ids=selIds();
  if(ids.length===0){toast('Pilih laporan dulu',true);return}
  var body={ids:ids,status:status};
  if(status==='rejected'){
    var note=window.prompt('Alasan penolakan untuk '+ids.length+' laporan (opsional):','');
    if(note===null){syncSelUI();return}body.note=note||undefined;
  }
  busyOn(btn);
  api('/farmer-prices/batch',{method:'POST',body:JSON.stringify(body)})
    .then(function(r){toast(status==='approved'?'Setuju '+r.processed+' laporan':'Tolak '+r.processed+' laporan');SEL={};loadMod()})
    .catch(function(e){syncSelUI();toast(e.message,true)});
}
function del(el,id){
  if(!window.confirm('Hapus permanen laporan ini?'))return;
  busyOn(el);
  api('/farmer-prices/'+encodeURIComponent(id),{method:'DELETE'})
    .then(function(){toast('Terhapus');loadMod()})
    .catch(function(e){busyOff(el);toast(e.message,true)});
}
function exportCsv(){
  apiBlob('/farmer-prices/export'+(MODFILTER?'?status='+MODFILTER:'')).then(function(b){
    var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='laporan-harga.csv';a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href)},4000);
    toast('CSV diunduh');
  }).catch(function(e){toast(e.message,true)});
}

/* ----------------------------- Notifikasi ------------------------------ */
function loadPush(){
  api('/push-tokens?page=0').then(function(d){
    DEV=d.total||0;
    $('p-psh').innerHTML=
      '<div class="grid stats"><div class="stat"><div class="n">'+fmtN(d.total)+'</div><div class="l">Perangkat terdaftar</div></div>'+
      '<div class="stat"><div class="n">'+fmtN(d.geolocated)+'</div><div class="l">Dengan lokasi</div></div>'+
      (d.page>=0?'<div class="stat"><div class="n">'+fmtN(d.rows.length)+'</div><div class="l">Ditampilkan</div></div>':'')+'</div>'+
      '<div class="card"><h3>Kirim notifikasi massal</h3>'+
      '<div class="grid g2">'+
      '<div><label>Judul</label><input id="pshtitle" maxlength="120" placeholder="cth: Harga cabai naik!"></div>'+
      '<div><label>Sasaran (maks 2000, kosongkan = semua)</label><input id="pshlimit" type="number" min="1" max="2000" placeholder="'+DEV+'">'+
      '<div class="limitnote">Akhirnya dikirim ke min(sasaran, perangkat). Ekspo push gratis via Expo.</div></div>'+
      '<div style="grid-column:1/-1"><label>Isi pesan</label><textarea id="pshbody" maxlength="800" placeholder="Tulis pesan singkat & jelas…"></textarea></div>'+
      '<div style="grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap">'+
      '<button class="btn solid" onclick="sendPush()">Kirim sekarang</button>'+
      '<button class="btn ghost" onclick="loadPush()">Muat ulang</button>'+
      '<div class="sp" style="flex:1"></div></div></div>'+
      '<div class="mut" style="margin-top:10px">Akan dikirim ke <b>'+fmtN(DEV)+'</b> perangkat (semua).</div></div>';
    loadCampaign(0);
  }).catch(function(e){toast(e.message,true)});
}
function sendPush(){
  var title=$('pshtitle').value.trim(),body=$('pshbody').value.trim();
  if(!title||!body){toast('Judul & isi wajib diisi',true);return}
  var limit=Number($('pshlimit').value)||DEV;
  if(!window.confirm('Kirim notifikasi ke '+fmtN(Math.min(limit||DEV,DEV))+' perangkat?'+String.fromCharCode(10,10)+'Judul: '+title+String.fromCharCode(10)+'Pesan: '+body.slice(0,60)))return;
  api('/push/send',{method:'POST',body:JSON.stringify({title:title,body:body,limit:limit})})
    .then(function(r){toast('Terkirim '+r.sent+', gagal '+r.failed);loadPush()})
    .catch(function(e){toast(e.message,true)});
}
function loadCampaign(){
  api('/push/campaigns').then(function(d){
    var c=d.campaigns||[];
    var rows=c.map(function(x){
      return '<tr><td>'+fmtTgl(x.created_at)+'</td><td>'+esc(x.title)+'</td><td>'+fmtN(x.targets)+'</td>'+
        '<td><span style="color:var(--acc)">'+fmtN(x.sent)+'</span></td>'+
        '<td'+(x.failed?' style="color:var(--danger)"':'')+'>'+fmtN(x.failed)+'</td></tr>';
    }).join('');
    var el=$('p-psh')||$('p-psh');
    var card=document.createElement('div');card.className='card';card.innerHTML='<h3>Riwayat kampanye</h3>'+
      '<div class="tbl"><table style="min-width:520px"><tr><th>Waktu</th><th>Judul</th><th>Terget</th><th>Teririm</th><th>Gagal</th></tr>'+rows+'</table></div>';
    el.appendChild(card);
  }).catch(function(){});
}

/* ------------------------------- Alarm --------------------------------- */
function loadAlerts(){
  $('p-alm').innerHTML='<div class="card"><div class="mut">Memuat…</div></div>';
  api('/alerts').then(function(d){
    function tbl(title,rows,colmap,kind){
      if(rows.length===0)return '<div class="card"><h3>'+title+'</h3><div class="mut">Tidak ada data.</div></div>';
      var tr=rows.map(function(r){
        var acts='<button class="btn danger sm" data-act="alm-del" data-kind="'+kind+'" data-id="'+r.id+'">Hapus</button> ';
        var cells=Object.keys(colmap).map(function(k){return colmap[k](r)}).join('');
        return '<tr>'+cells+'<td>'+acts+'</td></tr>';
      }).join('');
      return '<div class="card"><h3>'+title+' <span class="kbar">('+fmtN(rows.length)+' terakhir)</span></h3>'+
        '<div class="tbl" style="max-height:60vh"><table style="min-width:700px"><tr><th>Waktu</th><th>Komoditas</th><th>Provinsi / level</th><th>Kondisi</th><th>Status</th><th>Aksi</th></tr>'+tr+'</table></div></div>';
    }
    var p=tbl('Alarm harga (price_alerts)',d.priceAlerts,{
      waktu:function(r){return fmtTgl(r.created_at)},
      komoditas:function(r){return esc(r.commodity)},
      prov:function(r){return esc(r.province)+' / L'+r.level},
      kondisi:function(r){return (r.direction==='above'?'di atas':'di bawah')+' Rp'+fmtN(r.target)+(r.fired_count?' · tembak '+r.fired_count+'×':'')},
      status:function(r){return (r.active?'<span class="badge b-ok">aktif</span>':'<span class="badge b-mut">nonaktif</span>')+(r.last_fired_at?'<br><span class="mut">terakhir tembak '+fmtTgl(r.last_fired_at)+'</span>':'')}
    },'price');
    var c=tbl('Alarm perubahan (price_change_alerts)',d.changeAlerts,{
      waktu:function(r){return fmtTgl(r.created_at)},
      komoditas:function(r){return esc(r.commodity)},
      prov:function(r){return esc(r.province)+' / L'+r.level},
      kondisi:function(r){return 'perubahan ≥ '+r.threshold+'%'+(r.last_price?' · terakhir Rp'+fmtN(r.last_price):'')},
      status:function(r){return r.active?'<span class="badge b-ok">aktif</span>':'<span class="badge b-mut">nonaktif</span>'}
    },'change');
    var h='<div class="card"><h3>Ringkasan</h3><div class="grid stats">'+
      statCard(d.activePrice,'Alarm harga aktif')+
      statCard(d.totalChange,'Alarm perubahan')+
      statCard(d.priceAlerts.length,'Alarm harga dibuka')+
      '</div></div>'+p+c;
    $('p-alm').innerHTML=h;
  }).catch(function(e){toast(e.message,true)});
}
function delAlert(kind,id){
  if(!window.confirm('Hapus alarm ('+(kind==='price'?'price_alerts':'price_change_alerts')+') ini?'))return;
  api('/'+(kind==='price'?'alerts':'change-alerts')+'/'+encodeURIComponent(id),{method:'DELETE'})
    .then(function(){toast('Alarm dihapus');loadAlerts()})
    .catch(function(e){toast(e.message,true)});
}

/* ------------------------------ Perangkat ------------------------------ */
function loadDev(page){
  DEVACT=page||0;
  api('/push-tokens?page='+(page||0)).then(function(d){
    var rows=d.rows||[];
    var tr=rows.map(function(r){
      var t=encodeURIComponent(r.expo_token);
      return '<tr><td>'+fmtTgl(r.updated_at)+'<br><span class="mut">'+timeAgo(r.updated_at)+'</span></td>'+
        '<td class="mono">'+esc(r.expo_token.slice(0,34))+'…</td>'+
        '<td class="mono">'+esc((r.user_id||'').slice(0,13))+'-</td>'+
        '<td>'+esc(r.location_name||'-')+'<br><span class="mono mut">'+r.lat+', '+r.lon+'</span></td>'+
        '<td><button class="btn danger sm" data-act="tok-del" data-tok="'+t+'">Hapus</button></td></tr>';
    }).join('');
    var pages=Math.max(1,Math.ceil((d.total||0)/(d.size||200)));
    var pag='<div class="pager"><button class="btn ghost sm"'+(page>0?'':' disabled')+' onclick="loadDev('+(page-1)+')">← Sebelum</button>'+
      '<span class="kbar">Halaman '+(page+1)+' / '+pages+' · '+fmtN(d.total)+' perangkat · '+fmtN(d.geolocated)+' ber-geolokasi</span>'+
      '<button class="btn ghost sm"'+(page+1<pages?'':' disabled')+' onclick="loadDev('+(page+1)+')">Berikut →</button></div>';
    $('p-dev').innerHTML='<div class="card"><h3>Perangkat push terdaftar</h3>'+
      '<div class="tbl" style="max-height:65vh"><table style="min-width:760px"><tr><th>Terakhir aktif</th><th>Expo token</th><th>User</th><th>Lokasi</th><th>Aksi</th></tr>'+(tr||'<tr><td colspan="5"><span class="mut">Belum ada perangkat.</span></td></tr>')+'</table></div>'+pag+'</div>';
  }).catch(function(e){toast(e.message,true)});
}
function delTok(t){
  if(!window.confirm('Hapus perangkat ini dari daftar push?'))return;
  api('/push-tokens/'+encodeURIComponent(decodeURIComponent(t)),{method:'DELETE'})
    .then(function(){toast('Perangkat dihapus');loadDev(DEVACT)})
    .catch(function(e){toast(e.message,true)});
}

/* ------------------------------ Katalog --------------------------------- */
function loadKat(){
  fetch('/api/products').then(function(r){return r.json()}).then(function(d){
    var PROD=d.products||[];
    $('p-kat').innerHTML='<div class="card"><h3>Katalog produk</h3>'+
      '<div class="toolbar"><input id="qkat" placeholder="Cari produk / bahan aktif…" style="max-width:360px" oninput="renderKat()">'+
      '<span class="kbar">'+fmtN(PROD.length)+' produk</span></div>'+
      '<div class="tbl" style="max-height:65vh"><table><tr><th>Produk</th><th>Bahan Aktif</th><th>Bentuk</th><th>Dosis</th></tr><tbody id="tbl-kat"></tbody></table></div></div>';
    window.__PROD=PROD;
    _renderKat();
  });
}
var __KATQ=null;
function renderKat(){clearTimeout(__KATQ);__KATQ=setTimeout(_renderKat,140)}
function _renderKat(){
  var PROD=window.__PROD||[];
  var q=($('qkat')?$('qkat').value:'').toLowerCase();
  var rows=PROD.filter(function(p){return !q||JSON.stringify(p).toLowerCase().indexOf(q)>=0}).slice(0,80);
  $('tbl-kat').innerHTML=rows.map(function(p){
    var doses=(p.doses||[]).map(function(x){return esc(x.crop||x.target||'?')+': '+esc(x.dose||'')+esc(x.unit?' '+x.unit:'')}).join('<br>');
    return '<tr><td><b>'+esc(p.brand||p.name||'?')+'</b><br><span class="mut">'+esc(p.manufacturer||'')+'</span></td>'+
      '<td>'+esc(p.activeIngredient||p.active_ingredient||'-')+'</td><td>'+esc(p.formulation||p.form||'-')+'</td><td>'+(doses||'<span class="mut">-</span>')+'</td></tr>';
  }).join('')||'<tr><td colspan="4"><span class="mut">Tidak ditemukan.</span></td></tr>';
}

/* ----------------------------- Sinkron -------------------------------- */
function loadHealth(){
  $('p-hea').innerHTML='<div class="card"><div class="mut">Memuat…</div></div>';
  api('/market-health').then(function(m){
    var sync=m.lastSync,hist=m.lastSnapshot;
    var stale=!(sync&&new Date(sync.updated_at).getTime()>Date.now()-864e5);
    var h='<div class="grid stats">'+
      statCard(m.marketPrices,'Baris harga aktif')+
      statCard(m.history,'Riwayat harga')+
      statCard(m.nasional,'Nasional (Kemtan)')+
      statCard(m.perProvinsi,'Provinsi (SP2KP)')+
      statCard(m.provinces,'Provinsi unik')+
      statCard(sync?timeAgo(sync.updated_at):'-','Terakhir sinkron'+(sync?' · '+esc(sync.source):''),stale)+
      statCard(hist?hist.date:'-','Snapshot terakhir')+
      '</div>';
    $('p-hea').innerHTML='<div class="card"><h3>Kesehatan sinkron harga</h3>'+h+'</div>'+
      (stale?('<div class="alertbox"><div class="t">Sinkron tampak basi</div>Belum ada pembaruan data harga dalam 24 jam. Cek cron SP2KP (<code>sync-kemendag</code>) atau jalankan <code>POST /api/market/refresh</code>. Perangkat petani juga mengisi ulang saat online di provinsinya.</div>'):'');
  }).catch(function(e){toast(e.message,true)});
}

/* ------------------------------- AI Log -------------------------------- */
function loadAi(){
  $('p-ai').innerHTML='<div class="card"><div class="mut">Memuat…</div></div>';
  api('/ai-logs').then(function(d){
    var h='<div class="grid stats">'+
      statCard(d.total30d,'Query AI (30 hr)')+
      statCard(d.total7d,'Query AI (7 hr)')+
      statCard(d.users30d,'Pengguna (30 hr)')+
      statCard(d.users7d,'Pengguna (7 hr)')+
      statCard(d.promptTokens,'Token input')+
      statCard(d.completionTokens,'Token output')+
      statCard(d.avgLatencyMs,'Latensi rata-rata (ms)')+
      '</div>';
    var models='<div class="card"><h3>Pemakaian per model</h3><div class="tbl"><table style="min-width:520px"><tr><th>Model</th><th>Query</th><th>Token input</th><th>Token output</th></tr>'+
      d.models.map(function(m){
        return '<tr><td class="mono">'+esc(m[0])+'</td><td>'+fmtN(m[1].n)+'</td><td>'+fmtN(m[1].prompt)+'</td><td>'+fmtN(m[1].comp)+'</td></tr>';
      }).join('')+'</table></div></div>';
    var recent='<div class="card"><h3>Log terbaru <span class="kbar">(100 terakhir · model, token, tahap)</span></h3><div class="tbl" style="max-height:60vh"><table style="min-width:760px"><tr><th>Waktu</th><th>Model</th><th>Tokens in→out</th><th>Latensi</th><th>Pertanyaan</th><th>User</th></tr>'+
      (d.recent||[]).map(function(r){
        return '<tr><td>'+fmtTgl(r.created_at)+'</td><td class="mono">'+esc(String(r.model_used||'?'))+'</td>'+
          '<td>'+fmtN(r.prompt_tokens)+'→'+fmtN(r.completion_tokens)+'</td><td>'+fmtN(r.latency_ms)+' ms</td>'+
          '<td>'+esc(String(r.question||'').slice(0,60))+'</td><td class="mono">'+esc(String(r.user_id||'').slice(0,13))+'</td></tr>';
      }).join('')||'<tr><td colspan="6"><span class="mut">Belum ada data.</span></td></tr>'+
      '</table></div></div>';
    $('p-ai').innerHTML='<div class="card"><h3>Pemakaian AI 30 hari</h3>'+h+'</div>'+models+recent;
  }).catch(function(e){toast(e.message,true)});
}

/* ------------------------------ Sistem --------------------------------- */
function loadSys(){
  $('p-sys').innerHTML='<div class="card"><div class="mut">Memuat…</div></div>';
  api('/meta').then(function(m){
    function envRow(k,ok,note){
      var b=ok?'b-ok':'b-bad';
      return '<tr><td>'+esc(k)+'</td><td><span class="badge '+b+'">'+(ok?'Terpasang':'Hilang')+'</span>'+(note?' <span class="mut">'+esc(note)+'</span>':'')+'</td></tr>';
    }
    var env='<div class="card"><h3>Status environment</h3><div class="tbl"><table style="min-width:480px"><tr><th>Kunci</th><th>Status</th></tr>'+
      envRow('GEMINI_API_KEY',m.envSet.geminiApi)+
      envRow('OPENROUTER_API_KEY',m.envSet.openrouterApi)+
      envRow('SUPABASE_URL + SERVICE_ROLE',m.envSet.supabaseService)+
      envRow('ADMIN_TOKEN khusus',m.envSet.adminTokenKhusus,'default dev masih dipakai!')+
      envRow('CRON_SECRET',m.envSet.cronSecret)+
      '</table></div></div>';
    var models='<div class="card"><h3>Model aktif</h3>'+
      '<div><span class="mut">LLM utama:</span> <b>'+esc(m.models.llm||'-')+'</b></div>'+
      (m.models.llmAlt?'<div><span class="mut">Alternatif (OpenRouter):</span> <b>'+esc(m.models.llmAlt)+'</b></div>':'')+
      '<div class="mut" style="margin-top:6px">Fallback: '+esc((m.models.fallback||[]).join(', '))+'</div></div>';
    var dep='<div class="card"><h3>Deploy</h3><div class="tbl"><table style="min-width:420px">'+
      '<tr><th>Commit</th><td class="mono">'+esc(m.sha||'-')+'</td></tr>'+
      '<tr><th>Platform</th><td>'+(m.vercel?'Vercel':'Lokal / lainnya')+'</td></tr>'+
      '<tr><th>Node</th><td class="mono">'+esc(m.node||'-')+'</td></tr>'+
      '<tr><th>Ping server</th><td>'+fmtTgl(m.ts)+'</td></tr></table></div></div>';
    $('p-sys').innerHTML=env+models+dep;
  }).catch(function(e){toast(e.message,true)});
}

if(TOK){init()}
</script>
</body>
</html>`;