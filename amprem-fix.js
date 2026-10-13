/* Override: prefer Sign-in + lang=en, never auto-paste Login/lang=id */
(function () {
  function mailText(m) {
    return [m.subject, m.body, m.text, m.content, m.html, m.snippet].filter(Boolean).join(' ');
  }
  window.isSignInMail = function (m) {
    const subj = String(m.subject || ''), all = mailText(m);
    const good = /sign[\s-]*in\s+to\s+alight\s+creative/i;
    const bad = /log[\s-]*in\s+to\s+alight\s+creative/i;
    if (bad.test(subj) && !good.test(subj)) return false;
    if (good.test(subj)) return true;
    if (bad.test(all) && !good.test(all)) return false;
    return good.test(all);
  };
  function isEnAuthLink(u) {
    const s = String(u || '');
    if (/lang(=|%3D)id\b/i.test(s)) return false;
    return /lang(=|%3D)en\b/i.test(s);
  }
  function isAuthCandidate(u) {
    return /__\/auth\/links|alight-creative\.firebaseapp\.com|alightcreative\.com\/auth|oobCode|mode(=|%3D)signIn/i.test(String(u || ''));
  }
  function scoreAuthLink(u) {
    const s = String(u || '');
    let n = 0;
    if (isAuthCandidate(s)) n += 5;
    if (/mode(=|%3D)signIn/i.test(s)) n += 5;
    if (/lang(=|%3D)en\b/i.test(s)) n += 30;
    if (/lang(=|%3D)id\b/i.test(s)) n -= 80;
    return n;
  }
  window.extractSignInLink = function (m) {
    const raw = mailText(m).replace(/&/g, '&');
    let urls = (raw.match(/https?:\/\/[^\s<>"'\\)]+/g) || []).map(u => u.replace(/[.,;]+$/, ''));
    const decoded = [];
    for (const u of urls) {
      decoded.push(u);
      try { decoded.push(decodeURIComponent(u)); } catch (e) {}
    }
    urls = [...new Set(decoded)];
    const scored = urls
      .filter(u => isAuthCandidate(u) || /alight|firebaseapp|signin|sign-in|magic/i.test(u))
      .map(u => ({ u, s: scoreAuthLink(u) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s);
    const en = scored.find(x => isEnAuthLink(x.u));
    if (en) return en.u;
    const nonId = scored.find(x => !/lang(=|%3D)id\b/i.test(x.u));
    return nonId ? nonId.u : '';
  };
  window.findSignInLink = function (list) {
    const ts = x => { const n = Date.parse(x.date || x.time || x.created_at || ''); return isNaN(n) ? 0 : n; };
    const cands = list.filter(window.isSignInMail).sort((a, b) => ts(b) - ts(a));
    for (const m of cands) {
      const u = window.extractSignInLink(m);
      if (u && isEnAuthLink(u)) return u;
    }
    for (const m of cands) {
      const u = window.extractSignInLink(m);
      if (u) return u;
    }
    return '';
  };
  const _paste = window.pasteLink;
  if (typeof _paste === 'function') {
    window.pasteLink = function (url, addr, quiet) {
      if (url && /lang(=|%3D)id\b/i.test(url) && !/lang(=|%3D)en\b/i.test(url)) {
        if (typeof showMsg === 'function') showMsg('msg', 'Link lang=id diabaikan. Tunggu email Sign-in (EN).', 'err');
        return;
      }
      return _paste(url, addr, quiet);
    };
  }
})();
