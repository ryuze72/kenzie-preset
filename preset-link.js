/* WAJIB: link web = nama preset, BUKAN RYZ-xxx */
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
      if (location.protocol === 'http:' || location.protocol === 'https:') {
        if (location.hostname && location.hostname !== 'localhost') return location.origin;
      }
    } catch (e) {}
    try { if (typeof getSiteBase === 'function') return getSiteBase(); } catch (e) {}
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
    var fromLs = list().find(function (x) {
      return x && (x.id === key || slug(x.name) === sk || x.name === key);
    });
    if (fromLs) return fromLs;
    try {
      if (typeof presets !== 'undefined' && Array.isArray(presets)) {
        return presets.find(function (x) {
          return x && (x.id === key || slug(x.name) === sk || x.name === key);
        }) || null;
      }
    } catch (e) {}
    return null;
  }
  function urlFor(p) {
    if (!p) return base() + '/#home';
    var s = slug(p.name);
    if (!s || s === 'preset') s = String(p.id || 'preset');
    return base() + '/#preset/' + encodeURIComponent(s);
  }
  function patch() {
    window.presetSlug = slug;
    window.webLink = function (p) {
      if (!p) return base() + '/#home';
      if (typeof p === 'string') {
        var hit = resolve(p);
        return hit ? urlFor(hit) : (base() + '/#preset/' + encodeURIComponent(slug(p) || p));
      }
      return urlFor(p);
    };
    window.copyWebLink = function (id) {
      var p = resolve(id);
      var url = p ? urlFor(p) : (base() + '/#preset/' + encodeURIComponent(String(id || '')));
      if (typeof copyText === 'function') copyText(url, 'Link web disalin!');
      else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url);
        if (typeof toast === 'function') toast('Link web disalin!', 'ok');
      }
    };
    window.sharePreset = function (id) {
      var p = resolve(id);
      var url = p ? urlFor(p) : (base() + '/#preset/' + encodeURIComponent(String(id || '')));
      var title = (p && p.name) || String(id || 'Preset');
      var text = title + '\n' + url;
      if (navigator.share) {
        navigator.share({ title: title, text: text, url: url }).catch(function () {
          if (typeof copyText === 'function') copyText(text, 'Disalin!');
        });
      } else if (typeof copyText === 'function') copyText(text, 'Disalin!');
    };
  }
  function openFromHash() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h.startsWith('preset/')) return;
    var key = h.slice(7).split(/[/?#]/)[0];
    try { key = decodeURIComponent(key); } catch (e) {}
    if (!key) return;
    if (/^RYZ-\d+/i.test(key)) return;
    var p = resolve(key);
    if (p && typeof navigate === 'function') {
      try { navigate('detail', p.id); } catch (e) {}
    }
  }
  patch();
  setInterval(patch, 800);
  window.addEventListener('hashchange', function () { setTimeout(openFromHash, 40); });
  setTimeout(openFromHash, 600);
  setTimeout(openFromHash, 2000);
})();
