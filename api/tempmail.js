// Vercel Serverless — Temp Mail proxy (pola Zetttools / Zettmail)
// GET /api/tempmail?action=generate|domains|search|inbox|detail|uptime
// Upstream: https://zetttools.vercel.app/api/tempmail  (generator.email)
// Kompat lama: action=create → generate; action=inbox&email=user@domain
const UPSTREAM = 'https://zetttools.vercel.app/api/tempmail';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ status: false, error: 'Gunakan GET' });

  const q = req.query || {};
  let action = String(q.action || 'generate').toLowerCase().trim();

  // Alias kompatibel API lama
  if (action === 'create' || action === 'new') action = 'generate';

  const params = new URLSearchParams();
  params.set('action', action);

  // generate — tidak butuh param lain
  // domains — opsional
  if (action === 'search') {
    const qq = String(q.q || q.query || '').trim();
    if (qq) params.set('q', qq);
  }

  if (action === 'inbox' || action === 'detail' || action === 'uptime') {
    let domain = String(q.domain || '').trim();
    let user = String(q.user || q.username || '').trim();

    // Kompat: ?email=user@domain
    const email = String(q.email || '').trim();
    if (email && email.includes('@')) {
      const [u, d] = email.split('@');
      if (!user) user = u;
      if (!domain) domain = d;
    }

    if (user) params.set('user', user);
    if (domain) params.set('domain', domain);
    if (action === 'detail' && q.link) params.set('link', String(q.link));
  }

  // cache-bust ringan
  params.set('_t', String(Date.now()));

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(UPSTREAM + '?' + params.toString(), {
      method: 'GET',
      signal: ctl.signal,
      headers: {
        accept: 'application/json,text/plain,*/*',
        'user-agent': 'Mozilla/5.0 (compatible; KenziePreset/1.0)',
      },
    });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}

    if (!r.ok) {
      return res.status(r.status).json(
        data && typeof data === 'object'
          ? data
          : { status: false, error: 'Upstream HTTP ' + r.status, raw: text.slice(0, 200) }
      );
    }

    // Normalisasi sedikit biar frontend mudah
    if (action === 'generate' && data && data.email) {
      data.status = data.status || 'success';
      data.ok = true;
    }

    res.status(200);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(typeof data === 'object' && data !== null ? JSON.stringify(data) : text);
  } catch (e) {
    const why = (e && e.name === 'AbortError') ? 'timeout' : ((e && e.message) || 'unknown');
    return res.status(502).json({ status: false, ok: false, error: 'Gagal menghubungi temp mail (' + why + ')' });
  } finally {
    clearTimeout(timer);
  }
};

// ESM export fallback (beberapa template Vercel pakai export default)
module.exports.config = { maxDuration: 30 };
