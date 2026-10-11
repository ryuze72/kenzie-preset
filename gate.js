/* Gerbang password halaman admin. Password tidak disimpan polos (PBKDF2-SHA256).
   Catatan: ini proteksi klien-sisi + hash; untuk production gunakan backend auth. */
(function () {
  const SALT = 'kenzie-preset|gate|v1';
  const ITER = 150000;
  const HASH_HEX = 'abad49864f84d54b53cc83071acd0033da673b63701de655f1735c819138a48e';
  const KEY = 'kenzie_gate_ok_v1';

  async function pbkdf2(password) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(SALT), iterations: ITER, hash: 'SHA-256' }, keyMaterial, 256);
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function build() {
    if (sessionStorage.getItem(KEY) === '1') {
      document.documentElement.classList.add('gate-ok');
      return;
    }
    const overlay = document.createElement('div');
    overlay.id = 'gate-overlay';
    overlay.innerHTML = `
      <div class="gate-box">
        <h2>🔒 Admin Gate</h2>
        <p>Masukkan password untuk mengakses panel admin.</p>
        <input type="password" id="gate-pw" placeholder="Password" autocomplete="current-password" />
        <button id="gate-btn">Masuk</button>
        <p id="gate-err" style="color:#f66;display:none;margin-top:8px;"></p>
      </div>
    `;
    document.body.appendChild(overlay);
    const style = document.createElement('style');
    style.textContent = `
      #gate-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif}
      .gate-box{background:#1a1a2e;color:#eee;padding:2rem;border-radius:12px;max-width:340px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.4)}
      .gate-box h2{margin:0 0 .5rem;font-size:1.25rem}
      .gate-box p{margin:0 0 1rem;opacity:.8;font-size:.9rem}
      #gate-pw{width:100%;padding:.6rem .8rem;border:1px solid #333;border-radius:8px;background:#0f0f1a;color:#fff;font-size:1rem;box-sizing:border-box;margin-bottom:.75rem}
      #gate-btn{width:100%;padding:.65rem;border:0;border-radius:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:600;cursor:pointer;font-size:1rem}
      #gate-btn:hover{filter:brightness(1.1)}
      html:not(.gate-ok) body>*:not(#gate-overlay){visibility:hidden!important}
    `;
    document.head.appendChild(style);

    const btn = document.getElementById('gate-btn');
    const inp = document.getElementById('gate-pw');
    const err = document.getElementById('gate-err');
    async function tryLogin() {
      const pw = inp.value;
      if (!pw) return;
      btn.disabled = true;
      btn.textContent = 'Memeriksa...';
      try {
        const h = await pbkdf2(pw);
        if (h === HASH_HEX) {
          sessionStorage.setItem(KEY, '1');
          document.documentElement.classList.add('gate-ok');
          overlay.remove();
        } else {
          err.style.display = 'block';
          err.textContent = 'Password salah.';
          btn.disabled = false;
          btn.textContent = 'Masuk';
        }
      } catch (e) {
        err.style.display = 'block';
        err.textContent = 'Error: ' + e.message;
        btn.disabled = false;
        btn.textContent = 'Masuk';
      }
    }
    btn.addEventListener('click', tryLogin);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
    inp.focus();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
