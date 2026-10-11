// Vercel Serverless Function — proxy cadangan untuk API AM Premium (bila browser kena CORS).
// POST /api/amprem?path=send {email}   |   POST /api/amprem?path=verify {email, link}
// Tes cepat di browser: /api/amprem?path=status
const BASE = 'https://amprem-ran.vercel.app/api/';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const path = String((req.query && req.query.path) || '');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  try {
    let r;
    if (req.method === 'GET' && path === 'status') {
      r = await fetch(BASE + 'status', { signal: ctl.signal, headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' } });
    } else if (req.method === 'POST' && (path === 'send' || path === 'verify')) {
      let b = req.body;
      if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
      b = b || {};
      const payload = path === 'send' ? { email: String(b.email || '') } : { email: String(b.email || ''), link: String(b.link || '') };
      r = await fetch(BASE + path, {
        method: 'POST', signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', accept: 'application/json', 'user-agent': 'Mozilla/5.0' },
        body: JSON.stringify(payload),
      });
    } else {
      return res.status(404).json({ ok: false, message: 'Endpoint tidak dikenal' });
    }
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', r.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    const why = (e && e.name === 'AbortError') ? 'timeout 20 detik' : ((e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown');
    res.status(502).json({ ok: false, message: 'Gagal menghubungi API AM Premium (' + why + ')' });
  } finally { clearTimeout(timer); }
};
