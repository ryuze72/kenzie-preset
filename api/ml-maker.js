// Vercel Serverless Function — Fake Lobby ML (kartu profil Mobile Legends).
// POST /api/ml-maker  body JSON: { avatar:"data:image/...;base64,..." | "https://...", username, rank?, border? }
// Alur:
//  1. Bila avatar data-URL → upload sementara ke litterbox.catbox.moe → dapat link publik
//  2. Panggil Nexray GET /maker/fakelobyml?avatar=&nickname=
//  3. Cadangan: theresav multipart (jika masih hidup)
const NEXRAY = 'https://api.nexray.eu.cc/maker/fakelobyml';
const THERESAV = 'https://api.theresav.eu/api/maker/fake/ml';
const LITTERBOX = 'https://litterbox.catbox.moe/resources/internals/api.php';

async function hostAvatar(buf, mime, ext, signal) {
  const fd = new FormData();
  fd.append('reqtype', 'fileupload');
  fd.append('time', '1h');
  fd.append('fileToUpload', new Blob([buf], { type: mime }), 'avatar.' + ext);
  const r = await fetch(LITTERBOX, { method: 'POST', body: fd, signal });
  const text = (await r.text()).trim();
  if (!r.ok || !/^https?:\/\//i.test(text)) {
    throw new Error('upload gagal: ' + (text.slice(0, 120) || ('HTTP ' + r.status)));
  }
  return text;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Gunakan POST' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false, error: 'Body bukan JSON' });

  const rawAvatar = String(b.avatar || '').trim();
  const m = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(rawAvatar);
  const isHttp = /^https?:\/\//i.test(rawAvatar);
  if (!m && !isHttp) return res.status(400).json({ ok: false, error: 'Avatar harus gambar PNG/JPG/WEBP (data URL atau link)' });

  const username = String(b.username || '').trim().slice(0, 40);
  if (!username) return res.status(400).json({ ok: false, error: 'Username wajib diisi' });
  const rank = String(b.rank || '').trim().slice(0, 30);
  const border = String(b.border || '').trim().slice(0, 40);

  const errors = [];
  let avatarUrl = isHttp ? rawAvatar : '';
  let avatarBuf = null;
  let avatarMime = '';
  let avatarExt = 'png';

  if (m) {
    avatarBuf = Buffer.from(m[2], 'base64');
    avatarMime = m[1];
    avatarExt = m[1].includes('png') ? 'png' : m[1].includes('webp') ? 'webp' : 'jpg';
  }

  // Upload base64 → URL publik (diperlukan Nexray GET)
  if (!avatarUrl && avatarBuf) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 25000);
    try {
      avatarUrl = await hostAvatar(avatarBuf, avatarMime, avatarExt, ctl.signal);
    } catch (e) {
      const why = (e && e.name === 'AbortError') ? 'timeout upload' : ((e && e.message) || 'upload gagal');
      errors.push('host: ' + why);
    } finally {
      clearTimeout(timer);
    }
  }

  // ---- 1) Nexray ----
  if (avatarUrl) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 50000);
    try {
      const qs = new URLSearchParams({
        avatar: avatarUrl,
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
  } else {
    errors.push('nexray: dilewati (tidak ada URL avatar)');
  }

  // ---- 2) theresav (multipart, butuh buffer) ----
  if (avatarBuf) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 50000);
    try {
      const fd = new FormData();
      fd.append('avatar', new Blob([avatarBuf], { type: avatarMime }), 'avatar.' + avatarExt);
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
  }

  return res.status(502).json({
    ok: false,
    error: 'Gagal membuat Fake Lobby ML. Coba lagi nanti.',
    detail: errors.slice(0, 5),
  });
};
module.exports.config = { maxDuration: 60 };
