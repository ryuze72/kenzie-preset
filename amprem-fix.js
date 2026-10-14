/* Override: semua link Alight (lang=id / lang=en) boleh auto-tempel */
(function () {
  function mailText(m) {
    return [m.subject, m.body, m.text, m.content, m.html, m.snippet].filter(Boolean).join(' ');
  }
  // Terima Sign-in DAN Login ke Alight Creative
  window.isSignInMail = function (m) {
    const all = mailText(m) + ' ' + String(m.subject || '');
    return /alight\s*creative|(sign|log)[\s-]*in/i.test(all) &&
      (/alight|firebaseapp|oobCode|auth\/links/i.test(all) || /alight\s*creative/i.test(all));
  };
  function isAuthCandidate(u) {
    return /__\/auth\/links|alight-creative\.firebaseapp\.com|alightcreative\.com\/auth|oobCode|mode(=|%3D)signIn/i.test(String(u || ''));
  }
  function scoreAuthLink(u) {
    const s = String(u || '');
    let n = 0;
    if (isAuthCandidate(s)) n += 10;
    if (/mode(=|%3D)signIn/i.test(s)) n += 5;
    if (/lang(=|%3D)en\b/i.test(s)) n += 3; // prefer en sedikit, tapi id tetap diterima
    if (/lang(=|%3D)id\b/i.test(s)) n += 2;
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
    return scored.length ? scored[0].u : '';
  };
  window.findSignInLink = function (list) {
    const ts = x => { const n = Date.parse(x.date || x.time || x.created_at || ''); return isNaN(n) ? 0 : n; };
    const sorted = (list || []).slice().sort((a, b) => ts(b) - ts(a));
    const cands = sorted.filter(window.isSignInMail);
    for (const m of cands) {
      const u = window.extractSignInLink(m);
      if (u) return u;
    }
    for (const m of sorted) {
      const u = window.extractSignInLink(m);
      if (u) return u;
    }
    return '';
  };
  // Jangan blokir lang=id — semua link Alight boleh di-tempel
  // (pasteLink dari core/boost tetap jalan)
})();
