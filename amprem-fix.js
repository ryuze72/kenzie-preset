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
    if (/lang(=|%3D)id\b/i.test(u)) return false;
    return /lang(=|%3D)en\b/i.test(u);
  }
  function isAuthCandidate(u) {
    return /__\/auth\/links|alight-creative\.firebaseapp\.com|alightcreative\.com\/auth|oobCode|mode(=|%3D)signIn/i.test(u);
  }
  function scoreAuthLink(u) {
    let s = 0;
    if (isAuthCandidate(u)) s += 5;
    if (/mode(=|%3D)signIn/i.test(u)) s += 5;
    if (/lang(=|%3D)en\b/i.test(u)) s += 20;
    if (/lang(=|%3D)id\b/i.test(u)) s -= 50;
    if (/firebaseapp\.com/i.test(u)) s += 2;
    return s;
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
})();
