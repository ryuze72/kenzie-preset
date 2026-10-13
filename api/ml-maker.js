// Vercel Serverless Function — Fake Lobby ML (kartu profil Mobile Legends).
// POST /api/ml-maker  body JSON: { avatar:"data:image/...;base64,...", username, rank?, border? }
// Provider utama: Nexray  GET /maker/fakelobyml?avatar=&nickname=
// Cadangan: theresav POST /api/maker/fake/ml (multipart)
const NEXRAY = 'https://api.nexray.eu.cc/maker/fakelobyml';
const THERESAV = 'https://api.theresav.eu/api/maker/fake/ml';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Gunakan POST' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false, error: 'Body bukan JSON' });

  const avatar = String(b.avatar || '').trim();
  const m = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(avatar);
  const isHttp = /^https?:\/\//i.test(avatar);
  if (!m && !isHttp) return res.status(400).json({ ok: false, error: 'Avatar harus gambar PNG/JPG/WEBP (data URL atau link)' });

  const username = String(b.username || '').trim().slice(0, 40);
  if (!username) return res.status(400).json({ ok: false, error: 'Username wajib diisi' });
  const rank = String(b.rank || '').trim().slice(0, 30);
  const border = String(b.border || '').trim().slice(0, 40);

  const errors = [];

  // ---- 1) Nexray (GET, avatar = data URL atau http URL) ----
  {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 50000);
    try {
      const qs = new URLSearchParams({
        avatar: avatar,
        nickname: username,
        t: String(Date.now()),
      });
      if (rank) qs.set('rank', rank);
      if (border) qs.set('border', border);
      const r = await fetch(NEXRAY + '?' + qs.toString(), {
        method: 'GET',
        signal: ctl.signal,
        headers: { accept: 'image/*,application/json,*/*', 'user-agent': 'Mozilla/5.0' },
      });
      const ct = r.headers.get('content-type') || '';
      const buf = Buffer.from(await r.arrayBuffer());
      if (r.ok && (/^image\//i.test(ct) || buf[0] === 0x89 || buf[0] === 0xff)) {
        clearTimeout(timer);
        res.status(200);
        res.setHeader('Content-Type', /^image\//i.test(ct) ? ct : 'image/png');
        res.setHeader('Cache-Control', 'no-store');
        return res.send(buf);
      }
      let msg = 'HTTP ' + r.status;
      try {
        const j = JSON.parse(buf.toString('utf8'));
        msg = j.error || j.message || msg;
      } catch {}
      errors.push('nexray: ' + msg);
    } catch (e) {
      const why = (e && e.name === 'AbortError') ? 'timeout' : ((e && e.message) || 'unknown');
      errors.push('nexray: ' + why);
    } finally {
      clearTimeout(timer);
    }
  }

  // ---- 2) theresav (multipart, butuh base64) ----
  if (m) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 50000);
    try {
      const buf = Buffer.from(m[2], 'base64');
      const ext = m[1].includes('png') ? 'png' : m[1].includes('webp') ? 'webp' : 'jpg';
      const fd = new FormData();
      fd.append('avatar', new Blob([buf], { type: m[1] }), 'avatar.' + ext);
      fd.append('username', username);
      fd.append('rank', rank);
      fd.append('border', border);
      const r = await fetch(THERESAV, {
        method: 'POST',
        body: fd,
        signal: ctl.signal,
        headers: {
          'x-apikey': process.env.MUSIC_API_KEY || 'kenzie',
          accept: '*/*',
          'user-agent': 'Mozilla/5.0',
        },
      });
      const ct = r.headers.get('content-type') || 'application/octet-stream';
      const out = Buffer.from(await r.arrayBuffer());
      if (r.ok && (/image\//i.test(ct) || out[0] === 0x89 || out[0] === 0xff)) {
        clearTimeout(timer);
        res.status(200);
        res.setHeader('Content-Type', /^image\//i.test(ct) ? ct : 'image/png');
        res.setHeader('Cache-Control', 'no-store');
        return res.send(out);
      }
      let msg = 'HTTP ' + r.status;
      try {
        const j = JSON.parse(out.toString('utf8'));
        msg = j.error || j.message || msg;
      } catch {
        if (out.length < 200) msg = out.toString('utf8') || msg;
      }
      errors.push('theresav: ' + msg);
    } catch (e) {
      const why = (e && e.name === 'AbortError') ? 'timeout' : ((e && e.message) || 'unknown');
      errors.push('theresav: ' + why);
    } finally {
      clearTimeout(timer);
    }
  } else {
    errors.push('theresav: dilewati (avatar bukan data URL)');
  }

  return res.status(502).json({
    ok: false,
    error: 'Gagal membuat Fake Lobby ML. Coba lagi nanti.',
    detail: errors.slice(0, 4),
  });
};
module.exports.config = { maxDuration: 60 };
