/* Gerbang password halaman admin. Password tidak disimpan polos (PBKDF2-SHA256).
   Catatan: ini pengaman sisi-browser, bukan pengganti keamanan server. */
(function () {
  var path = '';
  try { path = (location.pathname || '/').toLowerCase(); } catch (e) {}
  var onAmprem = /amprem/i.test(path);
  // HD Foto hanya di homepage, jangan inject di AM Premium
  if (!onAmprem) {
    try{var _hds=document.createElement('script');_hds.src='/hd-ui.js';_hds.defer=true;(document.head||document.documentElement).appendChild(_hds);}catch(_e){}
  }
  try{var _ivf=document.createElement('script');_ivf.src='/iv-fix.js';_ivf.defer=true;(document.head||document.documentElement).appendChild(_ivf);}catch(_e2){}
  if (!onAmprem) {
    try{var _mpu=document.createElement('script');_mpu.src='/ml-profile-ui.js';_mpu.defer=true;(document.head||document.documentElement).appendChild(_mpu);}catch(_e3){}
    try{var _mrf=document.createElement('script');_mrf.src='/ml-rank-fix.js';_mrf.defer=true;(document.head||document.documentElement).appendChild(_mrf);}catch(_e4){}
  }
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
    '#kgate form{position:relative;width:100%;max-width:360px;padding:26px 22px 22px;border-radius:30px;text-align:center;border:.5px solid ' + (dark === 'dark' ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.9)') + ';background:' + (dark === 'dark' ? 'rgba(28,28,30,.82)' : 'rgba(255,255,255,.72)') + ';backdrop-filter:blur(40px) saturate(180%);-webkit-backdrop-filter:blur(40px) saturate(180%);box-shadow:0 24px 80px rgba(0,0,0,.35)}' +
    '#kgate h1{font-size:22px;font-weight:800;letter-spacing:-.4px;margin:0 0 6px}#kgate p{margin:0 0 18px;font-size:13px;opacity:.65;line-height:1.4}' +
    '#kgate input{width:100%;box-sizing:border-box;padding:14px 16px;border-radius:14px;border:1px solid ' + (dark === 'dark' ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)') + ';background:' + (dark === 'dark' ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.9)') + ';color:inherit;font:inherit;font-size:16px;outline:none;margin-bottom:12px}' +
    '#kgate input:focus{border-color:#0a84ff;box-shadow:0 0 0 3px rgba(10,132,255,.25)}' +
    '#kgate button{width:100%;min-height:48px;border:0;border-radius:14px;background:linear-gradient(135deg,#0a84ff,#64d2ff);color:#fff;font:inherit;font-weight:700;font-size:15px;cursor:pointer}' +
    '#kgate button:disabled{opacity:.55}#kgate .err{color:#ff453a;font-size:12px;min-height:18px;margin:8px 0 0}';
  document.head.appendChild(css);
  function build() {
    var root = document.createElement('div'); root.id = 'kgate';
    root.innerHTML = '<i></i><i></i><form autocomplete="off"><h1>Kenzie Preset</h1><p>Masukkan password untuk membuka</p><input type="password" id="kgatePw" placeholder="Password" inputmode="text" autocomplete="current-password" /><button type="submit" id="kgateBtn">Buka</button><div class="err" id="kgateErr"></div></form>';
    document.body.appendChild(root);
    var form = root.querySelector('form'), pw = root.querySelector('#kgatePw'), btn = root.querySelector('#kgateBtn'), er = root.querySelector('#kgateErr');
    form.addEventListener('submit', async function (e) {
      e.preventDefault(); er.textContent = ''; btn.disabled = true;
      try {
        if (!window.crypto || !crypto.subtle) throw new Error('no-subtle');
        var h = await derive(pw.value || '');
        if (h !== HASH) { er.textContent = 'Password salah'; btn.disabled = false; return; }
        ls(function () { localStorage.setItem(KEY, JSON.stringify({ h: HASH, t: Date.now() })); });
        de.classList.add('gate-ok'); root.remove();
      } catch (err) { er.textContent = 'Browser tidak mendukung (butuh HTTPS)'; btn.disabled = false; }
    });
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
