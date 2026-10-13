/* HD Foto — inject UI next to Fake FF (homepage only, bukan amprem) */
(function () {
  const HD_API = '/api/hd';
  let hdDataUrl = '';

  function isHomePage() {
    const p = (location.pathname || '/').replace(/\/+$/, '') || '/';
    // Jangan di AM Premium / halaman lain
    if (/amprem/i.test(p)) return false;
    if (/amprem/i.test(location.href || '')) return false;
    // Hanya jika ada bar tombol Fake ML/FF
    return !!document.querySelector('.ml-btns');
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function cleanupAmp() {
    // Hapus sisa UI HD di halaman amprem kalau sempat ter-inject
    if (!/amprem/i.test(location.pathname || '') && !/amprem/i.test(location.href || '')) return;
    ['hdModal', 'hdOpenBtn'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function inject() {
    cleanupAmp();
    if (!isHomePage()) return;

    const row = document.querySelector('.ml-btns');
    if (row && !document.getElementById('hdOpenBtn')) {
      const b = document.createElement('button');
      b.className = 'ml-open';
      b.type = 'button';
      b.id = 'hdOpenBtn';
      b.textContent = 'HD Foto';
      b.onclick = function () { hdOpen(); };
      row.appendChild(b);
    }

    if (!document.getElementById('hdModal')) {
      const wrap = document.createElement('div');
      wrap.innerHTML = '\n  <div class="overlay" id="hdModal">\n    <div class="modal">\n      <h3>HD Foto</h3>\n      <p style="color:var(--muted);font-size:12px;margin-bottom:12px">Upscale gambar (AI). Scale 2× / 4×.</p>\n      <div class="form-group">\n        <label>Foto *</label>\n        <input type="file" id="hdFile" accept="image/*" style="display:none" />\n        <div class="ml-pick"><img id="hdPrev" alt="" style="display:none" /><button type="button" class="btn btn-outline" style="font-size:12px" id="hdPickBtn">Pilih foto</button></div>\n      </div>\n      <div class="form-group"><label>Scale</label>\n        <select class="form-input" id="hdScale">\n          <option value="2">2×</option>\n          <option value="4" selected>4×</option>\n        </select>\n      </div>\n      <div class="ml-result" id="hdOut" hidden></div>\n      <div class="modal-actions">\n        <button class="btn btn-outline" type="button" id="hdClose">Tutup</button>\n        <button class="btn btn-primary" type="button" id="hdGo">Proses HD</button>\n      </div>\n    </div>\n  </div>';
      document.body.appendChild(wrap.firstElementChild);
      document.getElementById('hdFile').addEventListener('change', function () { hdPick(this); });
      document.getElementById('hdPickBtn').onclick = function () { document.getElementById('hdFile').click(); };
      document.getElementById('hdClose').onclick = function () {
        if (typeof closeStoreModal === 'function') closeStoreModal('hdModal');
        else {
          var m = document.getElementById('hdModal');
          if (m) { m.classList.remove('show', 'open', 'active'); m.style.display = ''; }
        }
      };
      document.getElementById('hdGo').onclick = function () { hdMake(); };
    }
  }

  window.hdOpen = function () {
    if (!isHomePage()) return;
    inject();
    if (typeof openStoreModal === 'function') openStoreModal('hdModal');
    else {
      const m = document.getElementById('hdModal');
      if (m) { m.classList.add('show'); m.style.display = 'flex'; }
    }
  };

  window.hdPick = function (input) {
    const f = input.files && input.files[0];
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) {
      if (typeof toast === 'function') toast('Max ~6MB', 'err');
      else alert('Max ~6MB');
      return;
    }
    const r = new FileReader();
    r.onload = function () {
      hdDataUrl = r.result;
      const img = document.getElementById('hdPrev');
      if (img) { img.src = hdDataUrl; img.style.display = 'block'; }
    };
    r.readAsDataURL(f);
  };

  window.hdMake = async function () {
    if (!hdDataUrl) {
      if (typeof toast === 'function') toast('Pilih foto dulu', 'err');
      else alert('Pilih foto dulu');
      return;
    }
    const scale = parseInt((document.getElementById('hdScale') || {}).value || '4', 10) || 4;
    const go = document.getElementById('hdGo');
    const out = document.getElementById('hdOut');
    go.disabled = true;
    go.textContent = 'Memproses…';
    try {
      const res = await fetch(HD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: hdDataUrl, scale: scale })
      });
      const ct = res.headers.get('content-type') || '';
      let src = '';
      if (res.ok && /^image\//i.test(ct)) {
        src = URL.createObjectURL(await res.blob());
      } else {
        const text = await res.text();
        let d = null;
        try { d = JSON.parse(text); } catch (e) {}
        if (!res.ok) throw new Error((d && (d.error || d.message)) || ('HTTP ' + res.status));
        const j = JSON.stringify(d || '');
        const hit = j.match(/https?:\/\/[^"\s]+\.(?:png|jpe?g|webp)[^"\s]*/i) || j.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/i);
        if (!hit) throw new Error('API tidak mengirim gambar');
        src = hit[0];
      }
      out.hidden = false;
      out.innerHTML = '<img alt="HD" src="' + src.replace(/"/g, '') + '" /><a class="btn btn-outline" style="display:inline-block;text-decoration:none;margin-top:8px" download="hd-foto.png" href="' + src.replace(/"/g, '') + '">Simpan gambar</a>';
      if (typeof toast === 'function') toast('HD selesai', 'ok');
    } catch (e) {
      if (typeof toast === 'function') toast('Gagal HD: ' + (e && e.message || 'error'), 'err');
      else alert('Gagal HD: ' + (e && e.message || 'error'));
    } finally {
      go.disabled = false;
      go.textContent = 'Proses HD';
    }
  };

  ready(inject);
})();
