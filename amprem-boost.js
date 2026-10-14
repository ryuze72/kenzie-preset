/* AM Premium boost */
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function show(id, text, type) {
    if (typeof showMsg === 'function') return showMsg(id, text, type);
    var el = document.getElementById(id);
    if (el) { el.textContent = text; el.className = 'msg' + (type ? ' ' + type : ''); }
  }

  function isAlight(u) {
    return /alight-creative\.firebaseapp\.com|alightcreative\.com\/auth|__\/auth\/links|oobCode|mode(=|%3D)signIn/i.test(String(u || ''));
  }
  // Semua link Alight (id & en) diterima
  function pickBest(urls) {
    var list = (urls || []).filter(isAlight);
    if (!list.length) return '';
    var en = list.find(function (u) { return /lang(=|%3D)en\b/i.test(u); });
    if (en) return en;
    return list[0];
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

  // Hanya Salin email di tab AM (bukan Salin/Open link di verification)
  function ensureButtons() {
    // Hapus tombol Salin link / Open link di panel AM jika sempat ter-inject
    ['btnCopyLink', 'btnOpenLink'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        var row = el.parentNode;
        el.remove();
        if (row && row.querySelectorAll('button').length === 0) row.remove();
      }
    });

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
  }

  // Tombol di view email: Salin link + Open link saja (tanpa Pakai ke Verify)
  function linkActionButtons(url) {
    if (!url) return '';
    var safe = String(url).replace(/&/g, '&').replace(/"/g, '"');
    return (
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">' +
        '<button type="button" class="copy-link-btn" data-act="copy" data-url="' + safe + '">Salin link</button>' +
        '<button type="button" class="copy-link-btn" data-act="open" data-url="' + safe + '">Open link</button>' +
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
        if (!url) return;
        if (act === 'copy') {
          navigator.clipboard.writeText(url).then(function () {
            show('msg', 'Link disalin', 'ok');
            if (document.getElementById('mailMsg')) show('mailMsg', 'Link disalin', 'ok');
          }).catch(function () { show('msg', 'Gagal salin', 'err'); });
        } else if (act === 'open') {
          try { window.open(url, '_blank', 'noopener,noreferrer'); }
          catch (err) { show('msg', 'Gagal buka link', 'err'); }
        }
      };
    });
  }

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
    // Terima semua link (id & en)
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

  window.copySavedEmail = function (email) {
    if (!email) return;
    navigator.clipboard.writeText(email).then(function () {
      show('msg', 'Email disalin', 'ok');
    }).catch(function () { show('msg', 'Gagal salin email', 'err'); });
  };

  // Toggle inbox: tap lagi = tutup
  window._openSavedInbox = window._openSavedInbox || null;
  var _loadSaved = window.loadSavedInbox;
  window.loadSavedInbox = async function (index, button) {
    var output = document.getElementById('savedInbox' + index);
    if (window._openSavedInbox === index && output && output.innerHTML) {
      // tutup
      output.innerHTML = '';
      window._openSavedInbox = null;
      if (button) { button.disabled = false; button.textContent = 'Inbox'; }
      return;
    }
    // tutup yang lain dulu
    if (window._openSavedInbox != null && window._openSavedInbox !== index) {
      var other = document.getElementById('savedInbox' + window._openSavedInbox);
      if (other) other.innerHTML = '';
    }
    window._openSavedInbox = index;
    if (typeof _loadSaved === 'function') {
      await _loadSaved(index, button);
    }
  };

  var _render = window.renderSaved;
  window.renderSaved = function () {
    if (typeof _render === 'function') _render();
    setTimeout(function () {
      document.querySelectorAll('#savedList .mail-item').forEach(function (item) {
        var from = item.querySelector('.mail-from');
        var email = from ? from.textContent.trim() : '';
        if (!email) return;

        // Pakai
        var pakai = item.querySelector('.saved-actions .btn-send');
        if (pakai && !pakai.dataset.boost) {
          pakai.dataset.boost = '1';
          pakai.onclick = function (e) {
            e.preventDefault();
            window.useSavedEmail(email);
          };
        }

        // Salin email di samping Hapus
        var actions = item.querySelector('.saved-actions');
        if (actions && !actions.querySelector('.btn-copy-email')) {
          var copyBtn = document.createElement('button');
          copyBtn.className = 'btn btn-copy btn-copy-email';
          copyBtn.type = 'button';
          copyBtn.textContent = 'Salin email';
          copyBtn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            window.copySavedEmail(email);
          };
          var hapus = actions.querySelector('.btn-verify');
          if (hapus) actions.insertBefore(copyBtn, hapus);
          else actions.appendChild(copyBtn);
        }
      });
    }, 50);
  };

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
      if (url && typeof window.pasteLink === 'function') {
        window.pasteLink(url, window.tempAddress || '', true);
      }
      // Hapus "Pakai ke Verify" lama / tombol non data-act
      view.querySelectorAll('.copy-link-btn:not([data-act])').forEach(function (el) { el.remove(); });
      view.querySelectorAll('[data-act="use"]').forEach(function (el) { el.remove(); });
      if (url && !view.querySelector('[data-act="copy"]')) {
        view.insertAdjacentHTML('beforeend', linkActionButtons(url));
      }
      bindLinkActions(view);
    }, 30);
  };

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
      if (url && typeof window.pasteLink === 'function') {
        window.pasteLink(url, addr, true);
      }
      view.querySelectorAll('.copy-link-btn:not([data-act])').forEach(function (el) { el.remove(); });
      view.querySelectorAll('[data-act="use"]').forEach(function (el) { el.remove(); });
      if (url && !view.querySelector('[data-act="copy"]')) {
        view.insertAdjacentHTML('beforeend', linkActionButtons(url));
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
