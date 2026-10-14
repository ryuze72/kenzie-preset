/* AM Premium boost: Salin email/link, Open link, Saved inbox, auto-paste Alight */
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function ensureButtons() {
    var email = document.getElementById('email');
    if (email && !document.getElementById('btnCopyEmail')) {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;gap:8px;align-items:stretch;margin-bottom:13px';
      email.style.marginBottom = '0';
      email.style.flex = '1';
      email.parentNode.insertBefore(wrap, email);
      wrap.appendChild(email);
      var b = document.createElement('button');
      b.id = 'btnCopyEmail';
      b.type = 'button';
      b.className = 'btn btn-copy';
      b.textContent = 'Salin';
      b.style.cssText = 'width:auto;min-width:72px;margin-bottom:0;padding:0 14px';
      b.onclick = function () {
        var v = (email.value || '').trim();
        if (!v) { show('msg', 'Email kosong', 'err'); return; }
        navigator.clipboard.writeText(v).then(function () { show('msg', 'Email disalin', 'ok'); })
          .catch(function () { show('msg', 'Gagal menyalin', 'err'); });
      };
      wrap.appendChild(b);
    }

    var link = document.getElementById('link');
    if (link && !document.getElementById('btnCopyLink')) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px';
      var c = document.createElement('button');
      c.id = 'btnCopyLink';
      c.type = 'button';
      c.className = 'btn btn-copy';
      c.textContent = 'Salin link';
      c.style.cssText = 'flex:1;margin-bottom:0';
      c.onclick = function () {
        var v = (link.value || '').trim();
        if (!v) { show('msg', 'Link masih kosong', 'err'); return; }
        navigator.clipboard.writeText(v).then(function () { show('msg', 'Link disalin', 'ok'); })
          .catch(function () { show('msg', 'Gagal menyalin link', 'err'); });
      };
      var o = document.createElement('button');
      o.id = 'btnOpenLink';
      o.type = 'button';
      o.className = 'btn btn-copy';
      o.textContent = 'Open link';
      o.style.cssText = 'flex:1;margin-bottom:0';
      o.onclick = function () {
        var v = (link.value || '').trim();
        if (!v) { show('msg', 'Link masih kosong', 'err'); return; }
        try { window.open(v, '_blank', 'noopener,noreferrer'); }
        catch (e) { show('msg', 'Gagal membuka link', 'err'); }
      };
      if (link.nextSibling) link.parentNode.insertBefore(row, link.nextSibling);
      else link.parentNode.appendChild(row);
      row.appendChild(c);
      row.appendChild(o);
    }
  }

  function show(id, text, type) {
    if (typeof showMsg === 'function') return showMsg(id, text, type);
    var el = document.getElementById(id);
    if (el) { el.textContent = text; el.className = 'msg' + (type ? ' ' + type : ''); }
  }

  function isAlight(u) {
    return /alight-creative\.firebaseapp\.com|alightcreative\.com\/auth|__\/auth\/links|oobCode|mode(=|%3D)signIn/i.test(String(u || ''));
  }
  function pickBest(urls) {
    var list = (urls || []).filter(isAlight);
    if (!list.length) return '';
    var en = list.find(function (u) { return /lang(=|%3D)en\b/i.test(u) && !/lang(=|%3D)id\b/i.test(u); });
    if (en) return en;
    var nonId = list.find(function (u) { return !/lang(=|%3D)id\b/i.test(u); });
    return nonId || list[0];
  }
  function extractUrls(m) {
    var raw = [m.subject, m.body, m.text, m.content, m.html, m.snippet].filter(Boolean).join(' ').replace(/&/g, '&');
    var urls = (raw.match(/https?:\/\/[^\s<>"'\\)]+/g) || []).map(function (u) { return u.replace(/[.,;]+$/, ''); });
    var extra = [];
    urls.forEach(function (u) { try { extra.push(decodeURIComponent(u)); } catch (e) {} });
    return urls.concat(extra);
  }

  var _fetch = window.fetchInbox;
  window.fetchInbox = async function (email) {
    var tok = '';
    try {
      if (typeof tokenFor === 'function') tok = tokenFor(email) || '';
    } catch (e) {}
    if (!tok) tok = email || '';
    var r = await fetch('/api/tempmail?action=inbox&email=' + encodeURIComponent(email) + '&token=' + encodeURIComponent(tok) + '&_t=' + Date.now());
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(d.error || d.message || ('HTTP ' + r.status));
    return d.messages || d.inbox || d.emails || (Array.isArray(d) ? d : []);
  };

  var _find = window.findSignInLink;
  window.findSignInLink = function (list) {
    var u = typeof _find === 'function' ? _find(list) : '';
    if (u) return u;
    var all = [];
    (list || []).forEach(function (m) { all = all.concat(extractUrls(m)); });
    return pickBest(all);
  };

  var _paste = window.pasteLink;
  window.pasteLink = function (url, addr, quiet) {
    if (!url) return;
    if (typeof _paste === 'function') return _paste(url, addr, quiet);
    var el = document.getElementById('link');
    if (el) el.value = url;
    if (addr) {
      var em = document.getElementById('email');
      if (em) em.value = addr;
    }
  };

  window.useSavedEmail = function (email) {
    var em = document.getElementById('email');
    if (em) em.value = email;
    window.tempAddress = email;
    try {
      var s = JSON.parse(localStorage.getItem('savedEmails') || '[]').find(function (x) { return x.email === email; });
      window.tempToken = (s && (s.token || s.api_token)) || email;
    } catch (e) { window.tempToken = email; }
    if (typeof goTab === 'function') goTab('am');
    if (window._boostInbox) clearInterval(window._boostInbox);
    function poll() {
      window.fetchInbox(email).then(function (list) {
        var u = window.findSignInLink(list);
        if (u) window.pasteLink(u, email, true);
      }).catch(function () {});
    }
    poll();
    window._boostInbox = setInterval(poll, 5000);
  };

  var _render = window.renderSaved;
  window.renderSaved = function () {
    if (typeof _render === 'function') _render();
    setTimeout(function () {
      document.querySelectorAll('#savedList .saved-actions .btn-send').forEach(function (btn) {
        if (btn.dataset.boost) return;
        btn.dataset.boost = '1';
        var item = btn.closest('.mail-item');
        var from = item && item.querySelector('.mail-from');
        var email = from ? from.textContent.trim() : '';
        if (!email) return;
        btn.onclick = function (e) {
          e.preventDefault();
          window.useSavedEmail(email);
        };
      });
    }, 50);
  };

  var _check = window.checkInbox;
  if (typeof _check === 'function') {
    window.checkInbox = async function (manual) {
      await _check(manual);
      try {
        var email = window.tempAddress || (document.getElementById('email') || {}).value;
        if (!email) return;
        var list = await window.fetchInbox(email);
        var u = window.findSignInLink(list);
        if (u) window.pasteLink(u, email, true);
      } catch (e) {}
    };
  }

  ready(function () {
    ensureButtons();
    if (typeof renderSaved === 'function') renderSaved();
  });
})();
