// Vercel Serverless Function — pembuat gambar "Fake Lobby FF".
// POST /api/ff-maker  body JSON: { "username": "TestFF" }  → balasan gambar (jpg/png)
// Diteruskan ke https://api.theresav.eu/api/maker/fake/ff (header x-apikey). Alamat bisa diganti lewat env FF_UPSTREAM.
// Dicoba POST (multipart) dulu; bila API menjawab 404/405, dicoba GET ?username=.
const BASE = process.env.FF_UPSTREAM || 'https://api.theresav.eu/api/maker/fake/ff';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Gunakan POST' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  const username = String((b && b.username) || '').trim().slice(0, 30);
  if (!username) return res.status(400).json({ ok: false, error: 'Username wajib diisi' });

  const headers = { 'x-apikey': process.env.MUSIC_API_KEY || 'kenzie', accept: '*/*', 'user-agent': 'Mozilla/5.0' };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 55000);
  try {
    const fd = new FormData(); fd.append('username', username);
    let r = await fetch(BASE, { method: 'POST', body: fd, signal: ctl.signal, headers });
    if (r.status === 404 || r.status === 405) r = await fetch(BASE + '?username=' + encodeURIComponent(username), { method: 'GET', signal: ctl.signal, headers });
    const ct = r.headers.get('content-type') || 'application/octet-stream';
    const out = Buffer.from(await r.arrayBuffer());
    if (!r.ok && !/json/i.test(ct)) return res.status(r.status).json({ ok: false, error: 'API membalas HTTP ' + r.status + ': ' + out.toString('utf8', 0, 200) });
    res.status(r.status).setHeader('Content-Type', ct).send(out);
  } catch (e) {
    const why = (e && e.name === 'AbortError') ? 'timeout 55 detik' : ((e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown');
    res.status(502).json({ ok: false, error: 'Gagal menghubungi API maker FF (' + why + ')' });
  } finally { clearTimeout(timer); }
};
module.exports.config = { maxDuration: 60 };
