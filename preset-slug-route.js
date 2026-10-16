/* Resolve #preset/judul-preset → buka detail (bukan hanya RYZ-id) */
(function () {
  function slug(name) {
    return String(name || '').trim().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u00C0-\u024f\-]+/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'preset';
  }
  function listPresets() {
    try {
      var arr = JSON.parse(localStorage.getItem('kenzie_presets_v2') || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function resolve(key) {
    key = String(key || '');
    try { key = decodeURIComponent(key); } catch (e) {}
    var sk = slug(key);
    return listPresets().find(function (x) {
      return x && (x.id === key || slug(x.name) === sk || x.name === key);
    }) || null;
  }
  function openDetail(p) {
    if (!p || !p.id) return;
    if (typeof window.navigate === 'function') {
      try { window.navigate('detail', p.id); return; } catch (e) {}
    }
    var cards = document.querySelectorAll('.card-id');
    for (var i = 0; i < cards.length; i++) {
      if ((cards[i].textContent || '').trim() === p.id) {
        var thumb = cards[i].closest('.card');
        if (thumb) {
          var t = thumb.querySelector('.card-thumb, .card-title');
          if (t) t.click();
        }
        return;
      }
    }
  }
  function handle() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h.startsWith('preset/')) return;
    var key = h.slice(7).split(/[/?#]/)[0];
    try { key = decodeURIComponent(key); } catch (e) {}
    if (!key) return;
    if (/^RYZ-\d+/i.test(key)) return;
    var p = resolve(key);
    if (p) openDetail(p);
  }
  window.addEventListener('hashchange', function () { setTimeout(handle, 30); });
  setTimeout(handle, 500);
  setTimeout(handle, 1500);
  setTimeout(handle, 3000);
})();
