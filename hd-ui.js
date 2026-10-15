/* HD Foto UI + hasil stabil (anti-kedip Control Center) */
(function () {
  var HD_API = '/api/hd';
  var hdDataUrl = '';

  function isHomePage() {
    try {
      var h = (location.pathname || '/').replace(/\/+$/, '') || '/';
      return h === '/' || /index\.html$/i.test(h);
    } catch (e) { return true; }
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function toStableDataUrl(src) {
    return new Promise(function (resolve) {
      var im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = function () {
        try {
          var max = 2048;
          var k = Math.min(1, max / Math.max(im.naturalWidth || im.width, im.naturalHeight || im.height));
          var w = Math.max(1, Math.round((im.naturalWidth || im.width) * k));
          var h = Math.max(1, Math.round((im.naturalHeight || im.height) * k));
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          var ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(im, 0, 0, w, h);
          resolve(c.toDataURL('image/png'));
        } catch (e) { resolve(src); }
      };
      im.onerror = function () { resolve(src); };
      im.src = src;
    });
  }

  function inject() {
    if (document.getElementById('hdModal')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="overlay" id="hdModal">' +
      '<div class="modal">' +
      '<h3>HD Foto</h3>' +
      '<div class="form-group">' +
      '<label>Foto *</label>' +
      '<input type="file" id="hdFile" accept="image/*" style="display:none" />' +
      '<div class="ml-pick"><img id="hdPrev" alt="" style="display:none;max-width:100%;border-radius:12px" />' +
      '<button type="button" class="btn btn-outline" style="font-size:12px" id="hdPickBtn">Pilih foto</button></div>' +
      '</div>' +
      '<div class="form-group"><label>Scale</label>' +
      '<select class="form-input" id="hdScale">' +
      '<option value="2">2×</option>' +
      '<option value="4" selected>4×</option>' +
      '</select></div>' +
      '<div class="ml-result" id="hdOut" hidden></div>' +
      '<div class="modal-actions">' +
      '<button class="btn btn-outline" type="button" id="hdClose">Tutup</button>' +
      '<button class="btn btn-primary" type="button" id="hdGo">Proses HD</button>' +
      '</div></div></div>';
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

  window.hdOpen = function () {
    if (!isHomePage()) return;
    inject();
    if (typeof openStoreModal === 'function') openStoreModal('hdModal');
    else {
      var m = document.getElementById('hdModal');
      if (m) { m.classList.add('show'); m.style.display = 'flex'; }
    }
  };

  window.hdPick = function (input) {
    var f = input.files && input.files[0];
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) {
      if (typeof toast === 'function') toast('Max ~6MB', 'err');
      else alert('Max ~6MB');
      return;
    }
    var r = new FileReader();
    r.onload = function () {
      hdDataUrl = r.result;
      var img = document.getElementById('hdPrev');
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
    var scale = parseInt((document.getElementById('hdScale') || {}).value || '4', 10) || 4;
    var go = document.getElementById('hdGo');
    var out = document.getElementById('hdOut');
    go.disabled = true;
    go.textContent = 'Memproses…';
    try {
      var res = await fetch(HD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: hdDataUrl, scale: scale })
      });
      var ct = res.headers.get('content-type') || '';
      var raw = '';
      if (res.ok && /^image\//i.test(ct)) {
        raw = URL.createObjectURL(await res.blob());
      } else {
        var text = await res.text();
        var d = null;
        try { d = JSON.parse(text); } catch (e) {}
        if (!res.ok) throw new Error((d && (d.error || d.message)) || ('HTTP ' + res.status));
        var j = JSON.stringify(d || '');
        var hit = j.match(/https?:\/\/[^"\s]+\.(?:png|jpe?g|webp)[^"\s]*/i) || j.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/i);
        if (!hit) throw new Error('API tidak mengirim gambar');
        raw = hit[0];
      }

      var src = await toStableDataUrl(raw);
      try { if (raw.indexOf('blob:') === 0) URL.revokeObjectURL(raw); } catch (e) {}

      out.hidden = false;
      out.innerHTML =
        '<img class="zoomable" alt="HD" onclick="imgView(this.src)" src="' + src.replace(/"/g, '') + '" />' +
        '<div class="ml-hint">Tap untuk perbesar · stabil (anti-kedip)</div>' +
        '<a class="btn btn-outline" style="display:inline-block;text-decoration:none;margin-top:8px" download="hd-foto.png" href="' + src.replace(/"/g, '') + '">Simpan gambar</a>';
      if (typeof imgView === 'function') imgView(src);
      if (typeof toast === 'function') toast('HD selesai', 'ok');
    } catch (e) {
      if (typeof toast === 'function') toast('Gagal HD: ' + (e && e.message || 'error'), 'err');
      else alert('Gagal HD: ' + (e && e.message || 'error'));
    } finally {
      go.disabled = false;
      go.textContent = 'Proses HD';
    }
  };

  ready(function () { inject(); });
})();
