// Vercel Serverless Function — proxy pencarian YouTube untuk menu Musik.
// Key bawaan ada di bawah (DEFAULT_KEY). Bila env YT_API_KEY di Vercel diisi, env itu yang dipakai.
const DEFAULT_KEY = 'jp6xy3uD05AEWvBFRS9X1fN7tbc3epbZLWCZZdNvAY4';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const key = process.env.YT_API_KEY || DEFAULT_KEY;

  const q = String((req.query && (req.query.query || req.query.q)) || '').trim().slice(0, 200);
  if (!q) return res.status(400).json({ error: 'Parameter query kosong' });

  try {
    const r = await fetch('https://ytdlpyton.nvlgroup.my.id/search/?query=' + encodeURIComponent(q), {
      method: 'GET',
      headers: { accept: '*/*', 'X-API-Key': key },
    });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', r.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    res.status(502).json({ error: 'Gagal menghubungi API YouTube' });
  }
};
