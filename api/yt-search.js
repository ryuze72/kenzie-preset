// Vercel Serverless Function — proxy pencarian YouTube untuk menu Musik.
// API key TIDAK ditulis di sini: isi di Vercel → Project → Settings → Environment Variables:
//   YT_API_KEY = (kunci X-API-Key dari ytdlpyton.nvlgroup.my.id)
// lalu Redeploy.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const key = process.env.YT_API_KEY;
  if (!key) return res.status(500).json({ error: 'YT_API_KEY belum diisi di Environment Variables Vercel (lalu Redeploy).' });

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
