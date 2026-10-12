// Vercel Serverless Function — proxy pencarian YouTube untuk menu Musik.
// Meneruskan GET /api/yt-search?query=... ke https://api.theresav.eu/api/search/youtube?query=...
// Key bawaan: 'kenzie'. Bila env MUSIC_API_KEY di Vercel diisi, nilai itu yang dipakai.
const BASE = 'https://api.theresav.eu/api/search/youtube';
const DEFAULT_KEY = 'kenzie';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const q = String((req.query && (req.query.query || req.query.q)) || '').trim().slice(0, 200);
  if (!q) return res.status(400).json({ error: 'Parameter query kosong' });

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(BASE + '?query=' + encodeURIComponent(q), {
      method: 'GET', signal: ctl.signal,
      headers: { accept: 'application/json', 'x-apikey': process.env.MUSIC_API_KEY || DEFAULT_KEY, 'user-agent': 'Mozilla/5.0' },
    });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', r.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    const why = (e && e.name === 'AbortError') ? 'timeout 20 detik' : ((e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown');
    res.status(502).json({ error: 'Gagal menghubungi API pencarian YouTube (' + why + ')' });
  } finally { clearTimeout(timer); }
};
