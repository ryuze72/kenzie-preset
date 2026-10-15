// Vercel Serverless Function — pembuat gambar "Fake Profil ML".
// POST /api/ml-profile  body JSON: { avatar:"data:image/...;base64,...", username, rank }
//  → diteruskan sebagai multipart ke ML_PROFILE_UPSTREAM (bawaan https://api.theresav.eu/api/maker/fake/ml-profile) dengan header x-apikey.
//  Alamat bawaan masih TEBAKAN — bila beda, isi env ML_PROFILE_UPSTREAM di Vercel.
//  - balasan gambar  : diteruskan apa adanya
//  - balasan JSON    : diteruskan (client mencari link gambar di dalamnya)
// Key bawaan 'kenzie'; env MUSIC_API_KEY bila diisi akan dipakai.
const BASE = process.env.ML_PROFILE_UPSTREAM || 'https://api.theresav.eu/api/maker/fake/ml-profile';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Gunakan POST' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false, error: 'Body bukan JSON' });
  const m = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.avatar || ''));
  if (b.avatar && !m) return res.status(400).json({ ok: false, error: 'Avatar harus gambar PNG/JPG/WEBP' });
  const username = String(b.username || '').trim().slice(0, 40);
  if (!username) return res.status(400).json({ ok: false, error: 'Username wajib diisi' });
  const rank = String(b.rank || '').trim().slice(0, 30);

  const fd = new FormData();
  if (m) {
    const buf = Buffer.from(m[2], 'base64');
    const ext = m[1].includes('png') ? 'png' : m[1].includes('webp') ? 'webp' : 'jpg';
    fd.append('avatar', new Blob([buf], { type: m[1] }), 'avatar.' + ext);
  }
  fd.append('username', username);
  fd.append('rank', rank);

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 55000);
  try {
    const r = await fetch(BASE, { method: 'POST', body: fd, signal: ctl.signal, headers: { 'x-apikey': process.env.MUSIC_API_KEY || 'kenzie', accept: '*/*', 'user-agent': 'Mozilla/5.0' } });
    const ct = r.headers.get('content-type') || 'application/octet-stream';
    const out = Buffer.from(await r.arrayBuffer());
    if (!r.ok && !/json/i.test(ct)) return res.status(r.status).json({ ok: false, error: 'API membalas HTTP ' + r.status + ': ' + out.toString('utf8', 0, 200) });
    res.status(r.status).setHeader('Content-Type', ct).send(out);
  } catch (e) {
    const why = (e && e.name === 'AbortError') ? 'timeout 55 detik' : ((e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown');
    res.status(502).json({ ok: false, error: 'Gagal menghubungi API maker (' + why + ')' });
  } finally { clearTimeout(timer); }
};
module.exports.config = { maxDuration: 60 };
