// Vercel Serverless Function — proxy cadangan untuk API AM Premium (bila browser kena CORS).
// POST /api/amprem?path=send {email}   |   POST /api/amprem?path=verify {email, link}
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Gunakan POST' });

  const path = String((req.query && req.query.path) || '');
  if (path !== 'send' && path !== 'verify') return res.status(404).json({ ok: false, message: 'Endpoint tidak dikenal' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const payload = path === 'send' ? { email: String(b.email || '') } : { email: String(b.email || ''), link: String(b.link || '') };

  try {
    const r = await fetch('https://amprem.ran.my.id/api/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', r.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    res.status(502).json({ ok: false, message: 'Gagal menghubungi API AM Premium' });
  }
};
