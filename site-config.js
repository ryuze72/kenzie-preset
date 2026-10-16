/* Domain resmi + format link: https://kenzie-preset.web.id/#preset/RYZ-059 */
(function () {
  var SITE = 'https://kenzie-preset.web.id';
  window.KENZIE_SITE_URL = SITE;
  window.SITE_URL = SITE;

  function makeUrl(id) {
    id = id == null ? '' : String(id).trim();
    // tolak nomor urut murni tanpa prefix RYZ-
    return id ? (SITE + '/#preset/' + id) : (SITE + '/#home');
  }

  function copyUrl(url, msg) {
    msg = msg || 'Link web disalin!';
    if (typeof window.copyText === 'function') {
      window.copyText(url, msg);
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        if (typeof toast === 'function') toast(msg, 'ok');
      }).catch(function () {
        try {
          var ta = document.createElement('textarea');
          ta.value = url;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          if (typeof toast === 'function') toast(msg, 'ok');
        } catch (e) {}
      });
      return;
    }
    try {
      var ta2 = document.createElement('textarea');
      ta2.value = url;
      document.body.appendChild(ta2);
      ta2.select();
      document.execCommand('copy');
      document.body.removeChild(ta2);
      if (typeof toast === 'function') toast(msg, 'ok');
    } catch (e) {}
  }

  function patch() {
    try {
      window.getSiteBase = function () { return SITE; };
      window.webLink = function (p) {
        if (!p) return SITE + '/#home';
        if (typeof p === 'string') return makeUrl(p);
        return makeUrl(p.id);
      };
      // onclick selalu kirim p.id (RYZ-xxx) — jangan pakai index upload
      window.copyWebLink = function (id) {
        var url = makeUrl(id);
        copyUrl(url, 'Link web disalin!');
      };
      window.sharePreset = function (id) {
        var url = makeUrl(id);
        var title = String(id || 'Preset');
        var text = title + '\n' + url;
        if (navigator.share) {
          navigator.share({ title: title, text: text, url: url }).catch(function () {
            copyUrl(text, 'Disalin!');
          });
        } else {
          copyUrl(text, 'Disalin!');
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
