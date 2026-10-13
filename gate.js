/* Gerbang password halaman admin. Password tidak disimpan polos (PBKDF2-SHA256).
   Catatan: ini pengaman sisi-browser, bukan pengganti keamanan server. */
(function () {
  try{var _hds=document.createElement('script');_hds.src='/hd-ui.js';_hds.defer=true;(document.head||document.documentElement).appendChild(_hds);}catch(_e){}
  var SALT = 'kenzie-preset|gate|v1', ITER = 150000, HASH = 'abad49864f84d54b53cc83071acd0033da673b63701de655f1735c819138a48e';
  var KEY = 'kenzie_gate_v1', TTL = 12 * 3600 * 1000, de = document.documentElement;
  function ls(f) { try { return f(); } catch (e) { return null; } }
  function ok() { var v = ls(function () { return JSON.parse(localStorage.getItem(KEY) || 'null'); }); return !!(v && v.h === HASH && Date.now() - v.t < TTL); }
  function hex(b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  async function derive(pw) {
    var enc = new TextEncoder(), k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(SALT), iterations: ITER }, k, 256));
  }
  if (ok()) { de.classList.add('gate-ok'); return; }
  var dark = ls(function () { return localStorage.getItem('kenzie_theme'); });
  if (!dark) dark = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  var css = document.createElement('style');
  css.textContent = '#kgate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:20px;font-family:"Plus Jakarta Sans",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;background:' + (dark === 'dark' ? '#000' : '#f2f2f7') + ';color:' + (dark === 'dark' ? '#fff' : '#000') + '}' +
    '#kgate i{position:absolute;width:60vmax;height:60vmax;border-radius:50%;filter:blur(70px);opacity:' + (dark === 'dark' ? '.4' : '.5') + ';animation:kg 24s ease-in-out infinite alternate}#kgate i:nth-child(1){background:' + (dark === 'dark' ? '#64d2ff' : '#5ac8fa') + ';top:-20vmax;left:-18vmax}#kgate i:nth-child(2){background:#0a84ff;bottom:-24vmax;right:-20vmax;animation-delay:-8s}' +
    '@keyframes kg{to{transform:translate3d(6vmax,4vmax,0) scale(1.1)}}' +
    '#kgate form{position:relative;width:100%;max-width:360px;padding:26px 22px 22px;border-radius:30px;text-align:center;border:.5px solid ' + (dark === 'dark' ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.9)') + ';background:' + (dark === 'dark' ? 'linear-gradient(180deg,rgba(255,255,255,.11),rgba(255,255,255,.04))' : 'linear-gradient(180deg,rgba(255,255,255,.8),rgba(255,255,255,.5))') + ';box-shadow:0 24px 60px rgba(0,0,0,.18);-webkit-backdrop-filter:blur(40px) saturate(180%);backdrop-filter:blur(40px) saturate(180%)}' +
    '#kgate .ic{width:56px;height:56px;margin:0 auto 14px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(180deg,#1a8aff,#007aff);color:#fff;box-shadow:0 10px 24px -8px rgba(0,122,255,.55)}#kgate .ic svg{width:26px;height:26px}' +
    '#kgate h1{font-size:20px;font-weight:800;letter-spacing:-.02em;margin:0 0 6px}#kgate p{margin:0 0 16px;font-size:13px;opacity:.7;line-height:1.45}' +
    '#kgate input{width:100%;height:48px;padding:0 16px;border-radius:14px;border:1px solid ' + (dark === 'dark' ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.08)') + ';background:' + (dark === 'dark' ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.9)') + ';color:inherit;font:inherit;font-size:15px;outline:none}' +
    '#kgate button{width:100%;height:50px;margin-top:12px;border:0;border-radius:999px;font:inherit;font-size:15px;font-weight:800;color:#fff;cursor:pointer;background:linear-gradient(180deg,#1a8aff,#007aff);box-shadow:0 8px 20px -8px rgba(0,122,255,.6)}#kgate button:disabled{opacity:.6}' +
    '#kgate .er{min-height:18px;margin-top:10px;font-size:12.5px;font-weight:700;color:#ff453a}#kgate form.sh{animation:ksh .35s}@keyframes ksh{25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}';
  document.head.appendChild(css);
  function build() {
    var g = document.createElement('div'); g.id = 'kgate';
    g.innerHTML = '<i></i><i></i><form autocomplete="off"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="3"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg></div><h1>Halaman Admin</h1><p>Masukkan password untuk melanjutkan</p><input type="password" id="kgp" placeholder="Password" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" /><button type="submit">Masuk</button><div class="er" id="kge"></div></form>';
    document.body.appendChild(g);
    var f = g.querySelector('form'), inp = g.querySelector('input'), btn = g.querySelector('button'), er = g.querySelector('.er'), fails = 0, until = 0;
    setTimeout(function () { inp.focus(); }, 50);
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (Date.now() < until) { er.textContent = 'Terlalu banyak percobaan. Tunggu ' + Math.ceil((until - Date.now()) / 1000) + ' detik.'; return; }
      if (!inp.value) return;
      btn.disabled = true; er.textContent = '';
      try {
        var h = await derive(inp.value);
        if (h === HASH) { ls(function () { localStorage.setItem(KEY, JSON.stringify({ h: HASH, t: Date.now() })); }); de.classList.add('gate-ok'); g.remove(); return; }
        fails++; if (fails >= 5) { until = Date.now() + 30000; fails = 0; }
        er.textContent = 'Password salah'; inp.value = ''; f.classList.remove('sh'); void f.offsetWidth; f.classList.add('sh'); inp.focus();
      } catch (x) { er.textContent = 'Browser tidak mendukung (butuh HTTPS)'; }
      btn.disabled = false;
    });
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
