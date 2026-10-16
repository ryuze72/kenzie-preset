/* Domain + link preset pakai JUDUL: https://kenzie-preset.web.id/#preset/nama-judul */
(function () {
  var SITE = 'https://kenzie-preset.web.id';
  window.KENZIE_SITE_URL = SITE;
  window.SITE_URL = SITE;

  function slug(name) {
    return String(name || '').trim().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u00C0-\u024f\-]+/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'preset';
  }

  function listPresets() {
    try {
      var raw = localStorage.getItem('kenzie_presets_v2');
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function resolve(key) {
    key = String(key || '');
    try { key = decodeURIComponent(key); } catch (e) {}
    var sk = slug(key);
    var arr = listPresets();
    return arr.find(function (x) {
      return x && (x.id === key || slug(x.name) === sk || x.name === key);
    }) || null;
  }

  function makeUrlFromPreset(p) {
    if (!p) return SITE + '/#home';
    var s = slug(p.name) || p.id;
    return SITE + '/#preset/' + encodeURIComponent(s);
  }

  function copyUrl(url, msg) {
    msg = msg || 'Link web disalin!';
    if (typeof window.copyText === 'function') return window.copyText(url, msg);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(url).then(function () {
        if (typeof toast === 'function') toast(msg, 'ok');
      });
    }
  }

  function patch() {
    try {
      window.presetSlug = slug;
      window.getSiteBase = function () { return SITE; };
      window.webLink = function (p) {
        if (!p) return SITE + '/#home';
        if (typeof p === 'string') {
          var hit = resolve(p);
          return hit ? makeUrlFromPreset(hit) : (SITE + '/#preset/' + encodeURIComponent(slug(p)));
        }
        return makeUrlFromPreset(p);
      };
      window.copyWebLink = function (id) {
        var p = resolve(id);
        var url = p ? makeUrlFromPreset(p) : (SITE + '/#preset/' + encodeURIComponent(slug(id)));
        copyUrl(url, 'Link web disalin!');
      };
      window.sharePreset = function (id) {
        var p = resolve(id);
        var url = p ? makeUrlFromPreset(p) : (SITE + '/#preset/' + encodeURIComponent(slug(id)));
        var title = (p && p.name) || String(id || 'Preset');
        var text = title + '\n' + url;
        if (navigator.share) {
          navigator.share({ title: title, text: text, url: url }).catch(function () { copyUrl(text, 'Disalin!'); });
        } else copyUrl(text, 'Disalin!');
      };
    } catch (e) {}
  }

  patch();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', patch);
  setTimeout(patch, 0);
  setTimeout(patch, 400);
  setTimeout(patch, 1500);
})();
