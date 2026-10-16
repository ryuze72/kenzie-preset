/* Salin link web = nama preset (bukan RYZ-xxx). Juga buka #preset/nama. */
(function () {
  function slug(name) {
    return String(name || '').trim().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u00C0-\u024f\-]+/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'preset';
  }
  function base() {
    try {
      if (typeof getSiteBase === 'function') return getSiteBase();
    } catch (e) {}
    try {
      if (location.protocol === 'http:' || location.protocol === 'https:') return location.origin;
    } catch (e) {}
    return 'https://kenzie-preset.web.id';
  }
  function list() {
    try {
      var a = JSON.parse(localStorage.getItem('kenzie_presets_v2') || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function resolve(key) {
    key = String(key || '');
    try { key = decodeURIComponent(key); } catch (e) {}
    var sk = slug(key);
    return list().find(function (x) {
      return x && (x.id === key || slug(x.name) === sk || x.name === key);
    }) || null;
  }
  function urlFor(p) {
    if (!p) return base() + '/#home';
    return base() + '/#preset/' + encodeURIComponent(slug(p.name) || p.id);
  }
  function patch() {
    window.presetSlug = slug;
    window.webLink = function (p) {
      if (!p) return base() + '/#home';
      if (typeof p === 'string') {
        var hit = resolve(p);
        return hit ? urlFor(hit) : (base() + '/#preset/' + encodeURIComponent(slug(p)));
      }
      return urlFor(p);
    };
    window.copyWebLink = function (id) {
      var p = resolve(id);
      var url = p ? urlFor(p) : (base() + '/#preset/' + encodeURIComponent(slug(id)));
      if (typeof copyText === 'function') copyText(url, 'Link web disalin!');
      else if (navigator.clipboard) navigator.clipboard.writeText(url);
    };
  }
  function openFromHash() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h.startsWith('preset/')) return;
    var key = h.slice(7).split(/[/?#]/)[0];
    try { key = decodeURIComponent(key); } catch (e) {}
    if (!key || /^RYZ-\d+/i.test(key)) return;
    var p = resolve(key);
    if (p && typeof navigate === 'function') {
      try { navigate('detail', p.id); } catch (e) {}
    }
  }
  patch();
  setTimeout(patch, 0);
  setTimeout(patch, 500);
  setTimeout(patch, 1500);
  window.addEventListener('hashchange', function () { setTimeout(openFromHash, 50); });
  setTimeout(openFromHash, 800);
})();
