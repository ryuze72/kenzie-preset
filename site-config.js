/* Domain resmi + format link: https://kenzie-preset.web.id/#preset/RYZ-059 */
(function () {
  var SITE = 'https://kenzie-preset.web.id';
  window.KENZIE_SITE_URL = SITE;
  window.SITE_URL = SITE;

  function makeUrl(id) {
    id = id == null ? '' : String(id).trim();
    return id ? (SITE + '/#preset/' + id) : (SITE + '/#home');
  }

  function findPreset(id) {
    var list = window.presets;
    if (!Array.isArray(list)) return null;
    var p = list.find(function (x) { return x && x.id === id; });
    if (p) return p;
    return null;
  }

  function patch() {
    try {
      window.getSiteBase = function () { return SITE; };
      window.webLink = function (p) {
        if (!p) return SITE + '/#home';
        if (typeof p === 'string') return makeUrl(p);
        return makeUrl(p.id);
      };
      window.copyWebLink = function (id) {
        var p = findPreset(id);
        var useId = (p && p.id) ? p.id : id;
        if (useId == null || useId === '') {
          if (typeof toast === 'function') toast('Preset tidak ditemukan', 'err');
          return;
        }
        var url = makeUrl(useId);
        if (typeof window.copyText === 'function') window.copyText(url, 'Link web disalin!');
        else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            if (typeof toast === 'function') toast('Link web disalin!', 'ok');
          });
        }
      };
      var prevShare = window.sharePreset;
      window.sharePreset = function (id) {
        var p = findPreset(id);
        if (!p) {
          if (typeof prevShare === 'function') return prevShare(id);
          return;
        }
        var url = makeUrl(p.id);
        var text = (p.name || p.id) + ' (' + p.id + ')\n' + url;
        if (navigator.share) {
          navigator.share({ title: p.name || p.id, text: text, url: url }).catch(function () {
            if (typeof window.copyText === 'function') window.copyText(text, 'Disalin!');
          });
        } else if (typeof window.copyText === 'function') {
          window.copyText(text, 'Disalin!');
        }
      };
    } catch (e) {}
  }

  patch();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', patch);
  setTimeout(patch, 0);
  setTimeout(patch, 300);
  setTimeout(patch, 1200);
})();
