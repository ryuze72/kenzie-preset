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
  function escapeHTML(s) {
    return String(s || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
  }

  // Tombol di view email: Salin link | Open link | Pakai ke Verify
  function linkActionButtons(url, addr) {
    if (!url) return '';
    var safe = String(url).replace(/&/g, '&').replace(/"/g, '"');
    return (
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">' +
        '<button type="button" class="copy-link-btn" data-act="copy" data-url="' + safe + '">Salin link</button>' +
        '<button type="button" class="copy-link-btn" data-act="open" data-url="' + safe + '">Open link</button>' +
        '<button type="button" class="copy-link-btn" data-act="use" data-url="' + safe + '" data-addr="' + escapeHTML(addr || '') + '">Pakai ke Verify</button>' +
      '</div>'
    );
  }
  function bindLinkActions(root) {
    if (!root) return;
    root.querySelectorAll('[data-act]').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        var url = btn.getAttribute('data-url') || '';
        var act = btn.getAttribute('data-act');
        var addr = btn.getAttribute('data-addr') || '';
        if (!url) return;
        if (act === 'copy') {
          navigator.clipboard.writeText(url).then(function () {
            show('msg', 'Link disalin', 'ok');
            if (document.getElementById('mailMsg')) show('mailMsg', 'Link disalin', 'ok');
          }).catch(function () { show('msg', 'Gagal salin', 'err'); });
        } else if (act === 'open') {
          try { window.open(url, '_blank', 'noopener,noreferrer'); }
          catch (err) { show('msg', 'Gagal buka link', 'err'); }
        } else if (act === 'use') {
          if (typeof window.pasteLink === 'function') window.pasteLink(url, addr || undefined);
          else {
            var el = document.getElementById('link');
            if (el) el.value = url;
            if (addr) {
              var em = document.getElementById('email');
              if (em) em.value = addr;
            }
          }
          if (typeof goTab === 'function') goTab('am');
          show('msg', 'Link ditempel ke Verification. Klik Verify.', 'ok');
        }
      };
    });
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

  // Override baca email Temp Mail
  var _readMail = window.readMail;
  window.readMail = function (i) {
    if (typeof _readMail === 'function') _readMail(i);
    setTimeout(function () {
      var m = window._mailCache && window._mailCache[i];
      if (!m) return;
      var view = document.getElementById('emailView');
      if (!view) return;
      var url = pickBest(extractUrls(m));
      if (!url) {
        var text = m.body || m.text || m.content || m.html || '';
        var urls = String(text).match(/https?:\/\/[^\s<>"]+/g) || [];
        url = pickBest(urls) || urls.find(function (u) { return isAlight(u); }) || '';
      }
      if (!url) return;
      // auto tempel juga
      if (typeof window.pasteLink === 'function') {
        window.pasteLink(url, window.tempAddress || '', true);
      }
      if (!view.querySelector('[data-act]')) {
        view.insertAdjacentHTML('beforeend', linkActionButtons(url, window.tempAddress || ''));
      }
      bindLinkActions(view);
    }, 30);
  };

  // Override baca email Saved
  var _readSaved = window.readSavedMail;
  window.readSavedMail = function (index, messageIndex) {
    if (typeof _readSaved === 'function') _readSaved(index, messageIndex);
    setTimeout(function () {
      var m = window._savedMailCache && window._savedMailCache[index] && window._savedMailCache[index][messageIndex];
      if (!m) return;
      var view = document.getElementById('savedMailView' + index);
      if (!view) return;
      var saved = [];
      try { saved = JSON.parse(localStorage.getItem('savedEmails') || '[]'); } catch (e) {}
      var addr = (saved[index] && saved[index].email) || '';
      var url = pickBest(extractUrls(m));
      if (!url) {
        var text = m.body || m.text || m.content || m.html || '';
        var urls = String(text).match(/https?:\/\/[^\s<>"]+/g) || [];
        url = pickBest(urls) || urls.find(function (u) { return isAlight(u); }) || '';
      }
      if (!url) return;
      if (typeof window.pasteLink === 'function') {
        window.pasteLink(url, addr, true);
      }
      // Hapus tombol lama single "Pakai link ini" kalau ada, ganti set tombol lengkap
      var old = view.querySelector('.copy-link-btn:not([data-act])');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      if (!view.querySelector('[data-act]')) {
        view.insertAdjacentHTML('beforeend', linkActionButtons(url, addr));
      }
      bindLinkActions(view);
    }, 30);
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
