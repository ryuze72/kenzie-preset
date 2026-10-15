// POST /api/ml-profile
// body JSON: { avatar?: "data:image/...;base64,..." | "https://...", username, rank? }
// Proxy → litterbox (host avatar) + nexray fakelobyml + theresav /api/maker/fake/ml
const NEXRAY = 'https://api.nexray.eu.cc/maker/fakelobyml';
const THERESAV = 'https://api.theresav.eu/api/maker/fake/ml';
const LITTERBOX = 'https://litterbox.catbox.moe/resources/internals/api.php';
const APIKEY = process.env.MUSIC_API_KEY || 'kenzie';

async function hostAvatar(buf, mime, ext, signal) {
  const fd = new FormData();
  fd.append('reqtype', 'fileupload');
  fd.append('time', '1h');
  const file = typeof File !== 'undefined'
    ? new File([buf], 'avatar.' + ext, { type: mime })
    : new Blob([buf], { type: mime });
  fd.append('fileToUpload', file, 'avatar.' + ext);
  const r = await fetch(LITTERBOX, { method: 'POST', body: fd, signal });
  const text = (await r.text()).trim();
  if (!r.ok || !/^https?:\/\//i.test(text)) {
    throw new Error('upload gagal: ' + (text.slice(0, 120) || ('HTTP ' + r.status)));
  }
  return text;
}

function isImageBuf(buf, ct) {
  if (/image\//i.test(ct || '')) return true;
  if (!buf || buf.length < 8) return false;
  if (buf[0] === 0x89 && buf[1] === 0x50) return true;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf[0] === 0x47 && buf[1] === 0x49) return true;
  if (buf[0] === 0x52 && buf[1] === 0x49) return true;
  return false;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Gunakan POST' });

  let b = req.body;
  if (typeof b === 'string') {
    try { b = JSON.parse(b); } catch { b = null; }
  }
  if (!b || typeof b !== 'object') {
    return res.status(400).json({ ok: false, error: 'Body bukan JSON' });
  }

  const rawAvatar = String(b.avatar || '').trim();
  const m = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(rawAvatar);
  const isHttp = /^https?:\/\//i.test(rawAvatar);
  const username = String(b.username || '').trim().slice(0, 40);
  if (!username) return res.status(400).json({ ok: false, error: 'Username wajib diisi' });
  const rank = String(b.rank || '').trim().slice(0, 30);

  let avatarUrl = isHttp ? rawAvatar : '';
  let avatarBuf = null;
  let avatarMime = 'image/png';
  let avatarExt = 'png';

  if (m) {
    avatarBuf = Buffer.from(m[2], 'base64');
    avatarMime = m[1];
    avatarExt = m[1].includes('png') ? 'png' : m[1].includes('webp') ? 'webp' : 'jpg';
  }

  const errors = [];

  if (avatarBuf && !avatarUrl) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 25000);
    try {
      avatarUrl = await hostAvatar(avatarBuf, avatarMime, avatarExt, ctl.signal);
    } catch (e) {
      errors.push('host: ' + ((e && e.message) || 'gagal'));
    } finally {
      clearTimeout(timer);
    }
  }

  if (avatarUrl) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 50000);
    try {
      const q = new URL(NEXRAY);
      q.searchParams.set('avatar', avatarUrl);
      q.searchParams.set('nickname', username);
      if (rank) q.searchParams.set('rank', rank);
      const r = await fetch(q.toString(), {
        method: 'GET',
        signal: ctl.signal,
        headers: { accept: '*/*', 'user-agent': 'Mozilla/5.0' },
      });
      const ct = r.headers.get('content-type') || '';
      const out = Buffer.from(await r.arrayBuffer());
      if (r.ok && isImageBuf(out, ct)) {
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
      errors.push('nexray: ' + msg);
    } catch (e) {
      errors.push('nexray: ' + ((e && e.name === 'AbortError') ? 'timeout' : ((e && e.message) || 'unknown')));
    } finally {
      clearTimeout(timer);
    }
  } else {
    errors.push('nexray: dilewati (tidak ada URL avatar)');
  }

  if (avatarBuf) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 55000);
    try {
      const fd = new FormData();
      const file = typeof File !== 'undefined'
        ? new File([avatarBuf], 'avatar.' + avatarExt, { type: avatarMime })
        : new Blob([avatarBuf], { type: avatarMime });
      fd.append('avatar', file, 'avatar.' + avatarExt);
      fd.append('username', username);
      if (rank) fd.append('rank', rank);
      const r = await fetch(THERESAV, {
        method: 'POST',
        body: fd,
        signal: ctl.signal,
        headers: {
          'x-apikey': APIKEY,
          accept: '*/*',
          'user-agent': 'Mozilla/5.0',
        },
      });
      const ct = r.headers.get('content-type') || '';
      const out = Buffer.from(await r.arrayBuffer());
      if (r.ok && isImageBuf(out, ct)) {
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
      errors.push('theresav: ' + ((e && e.name === 'AbortError') ? 'timeout' : ((e && e.message) || 'unknown')));
    } finally {
      clearTimeout(timer);
    }
  } else if (!avatarUrl) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 55000);
    try {
      const fd = new FormData();
      fd.append('username', username);
      if (rank) fd.append('rank', rank);
      const r = await fetch(THERESAV, {
        method: 'POST',
        body: fd,
        signal: ctl.signal,
        headers: { 'x-apikey': APIKEY, accept: '*/*', 'user-agent': 'Mozilla/5.0' },
      });
      const ct = r.headers.get('content-type') || '';
      const out = Buffer.from(await r.arrayBuffer());
      if (r.ok && isImageBuf(out, ct)) {
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
      errors.push('theresav: ' + ((e && e.message) || 'unknown'));
    } finally {
      clearTimeout(timer);
    }
  }

  return res.status(502).json({
    ok: false,
    error: 'Gagal membuat Fake Profil ML. Coba lagi nanti.',
    detail: errors.slice(0, 6),
  });
};
module.exports.config = { maxDuration: 60 };
