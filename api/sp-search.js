// Vercel Serverless Function — proxy cadangan untuk pencarian lagu.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  let q = '';
  if (req.method === 'POST') {
    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
    q = (b && b.q) || '';
  } else {
    q = (req.query && req.query.q) || '';
  }
  q = String(q).trim().slice(0, 200);
  if (!q) return res.status(400).json({ error: 'Parameter q kosong' });

  try {
    const r = await fetch('https://api.jhx.my.id/sp-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q }),
    });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', r.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    res.status(502).json({ error: 'Gagal menghubungi API musik' });
  }
};
