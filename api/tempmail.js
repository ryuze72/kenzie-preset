// Vercel Serverless — Temp Mail proxy
// Upstream: api.theresav.eu (sepasang AM Premium)
//   GET /api/tools/generator-email/create?domain=
//   GET /api/tools/generator-email/inbox?email=
//
// Frontend actions (kompat):
//   ?action=generate|create  → create
//   ?action=inbox&email=     → inbox
const BASE = process.env.TEMPMAIL_UPSTREAM || 'https://api.theresav.eu/api/tools/generator-email';
const API_KEY = process.env.AM_API_KEY || process.env.MUSIC_API_KEY || 'kenzie';
const DEFAULT_DOMAIN = process.env.TEMPMAIL_DOMAIN || 'acqq.dev';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

async function theresav(path, query, signal) {
  const qs = new URLSearchParams(query || {});
  const url = BASE + path + (qs.toString() ? '?' + qs.toString() : '');
  const r = await fetch(url, {
    method: 'GET',
    signal,
    headers: {
      accept: 'application/json',
      'x-apikey': API_KEY,
      'user-agent': 'Mozilla/5.0 (compatible; KenziePreset/1.0)',
    },
  });
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { r, text, data };
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ status: false, error: 'Gunakan GET' });

  const q = req.query || {};
  let action = String(q.action || 'generate').toLowerCase().trim();
  if (action === 'create' || action === 'new') action = 'generate';

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);

  try {
    // ---------- GENERATE ----------
    if (action === 'generate') {
      const domain = String(q.domain || DEFAULT_DOMAIN).trim() || DEFAULT_DOMAIN;
      const { r, text, data } = await theresav('/create', { domain }, ctl.signal);

      if (!r.ok) {
        return res.status(r.status).json({
          status: false,
          ok: false,
          error: 'Upstream HTTP ' + r.status,
          raw: text.slice(0, 200),
        });
      }

      const result = (data && data.result) || data || {};
      const email = result.email || data.email;
      const user = result.user || result.username || (email ? String(email).split('@')[0] : '');
      const dom = result.domain || (email ? String(email).split('@')[1] : domain);

      if (!email) {
        return res.status(502).json({
          status: false,
          ok: false,
          error: (data && (data.error || data.message)) || 'Gagal generate email',
          raw: text.slice(0, 200),
        });
      }

      // Bentuk kompat frontend amprem.html
      return res.status(200).json({
        status: 'success',
        ok: true,
        email: email,
        username: user,
        domain: dom,
        api_token: email, // token = email (inbox theresav cukup pakai email)
        token: email,
        result: result,
      });
    }

    // ---------- INBOX ----------
    if (action === 'inbox') {
      let email = String(q.email || '').trim();
      if (!email) {
        const user = String(q.user || q.username || '').trim();
        const domain = String(q.domain || '').trim();
        if (user && domain) email = user + '@' + domain;
      }
      // Kompat: token dulu disimpan sebagai email
      if (!email && q.token) email = String(q.token).trim();
      if (!email && q.api_token) email = String(q.api_token).trim();

      if (!email || !email.includes('@')) {
        return res.status(400).json({ status: false, ok: false, error: 'Parameter email wajib' });
      }

      const { r, text, data } = await theresav('/inbox', { email }, ctl.signal);

      if (!r.ok) {
        return res.status(r.status).json({
          status: false,
          ok: false,
          error: 'Upstream HTTP ' + r.status,
          raw: text.slice(0, 200),
        });
      }

      const result = (data && data.result) || data || {};
      let messages = result.messages || result.inbox || result.emails || data.messages || [];
      if (!Array.isArray(messages)) messages = [];

      return res.status(200).json({
        status: true,
        ok: true,
        email: result.email || email,
        total: result.total != null ? result.total : messages.length,
        messages: messages,
      });
    }

    // ---------- DETAIL (opsional: forward ke inbox filter) ----------
    if (action === 'detail') {
      return res.status(400).json({
        status: false,
        error: 'action detail tidak didukung di provider ini; buka pesan dari list inbox',
      });
    }

    // ---------- DOMAINS ----------
    if (action === 'domains') {
      return res.status(200).json([DEFAULT_DOMAIN, 'acqq.dev', 'refk.site']);
    }

    return res.status(400).json({
      status: false,
      error: 'action tidak dikenal',
      allow: ['generate', 'create', 'inbox', 'domains'],
    });
  } catch (e) {
    const why = (e && e.name === 'AbortError') ? 'timeout' : ((e && e.message) || 'unknown');
    return res.status(502).json({ status: false, ok: false, error: 'Gagal temp mail (' + why + ')' });
  } finally {
    clearTimeout(timer);
  }
};

module.exports.config = { maxDuration: 30 };
