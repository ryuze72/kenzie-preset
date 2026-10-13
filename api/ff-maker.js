// Vercel Serverless — Fake Lobby FF
// POST /api/ff-maker  JSON: { username, avatar? }
// Upstream: Nexray GET /maker/fakelobyff (theresav sering 521)
const NEXRAY = 'https://api.nexray.eu.cc/maker/fakelobyff';
const THERESAV = 'https://api.theresav.eu/api/maker/fake/ff';
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

function isImageResponse(ct, buf) {
  if (/image\/(png|jpe?g|webp|gif)/i.test(ct || '')) return true;
  if (!buf || buf.length < 4) return false;
  // JPEG FF D8 / PNG 89 50 / WEBP RIFF
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf[0] === 0x89 && buf[1] === 0x50) return true;
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return true;
  return false;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Gunakan POST' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  const username = String((b && b.username) || (b && b.nickname) || '').trim().slice(0, 30);
  if (!username) return res.status(400).json({ ok: false, error: 'Username wajib diisi' });

  const rawAvatar = String((b && b.avatar) || '').trim();
  const m = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(rawAvatar);
  const isHttp = /^https?:\/\//i.test(rawAvatar);

  let avatarUrl = isHttp ? rawAvatar : '';
  const errors = [];

  if (m && !avatarUrl) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 25000);
    try {
      const buf = Buffer.from(m[2], 'base64');
      const mime = m[1];
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
      avatarUrl = await hostAvatar(buf, mime, ext, ctl.signal);
    } catch (e) {
      errors.push('host: ' + ((e && e.name === 'AbortError') ? 'timeout upload' : ((e && e.message) || 'upload gagal')));
    } finally {
      clearTimeout(timer);
    }
  }

  // ---- 1) Nexray ----
  {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 50000);
    try {
      const qs = new URLSearchParams({ nickname: username, t: String(Date.now()) });
      if (avatarUrl) qs.set('avatar', avatarUrl);
      const r = await fetch(NEXRAY + '?' + qs.toString(), {
        method: 'GET',
        signal: ctl.signal,
        headers: { accept: 'image/*,*/*', 'user-agent': 'Mozilla/5.0 (compatible; KenziePreset/1.0)' },
      });
      const buf = Buffer.from(await r.arrayBuffer());
      const ct = r.headers.get('content-type') || '';
      if (r.ok && isImageResponse(ct, buf)) {
        return res.status(200).setHeader('Content-Type', /image\//i.test(ct) ? ct : 'image/jpeg').send(buf);
      }
      // JSON error from nexray
      let msg = 'HTTP ' + r.status;
      try {
        const j = JSON.parse(buf.toString('utf8'));
        if (j && j.error) msg = j.error;
      } catch {}
      errors.push('nexray: ' + msg);
    } catch (e) {
      errors.push('nexray: ' + ((e && e.name === 'AbortError') ? 'timeout' : ((e && e.message) || 'error')));
    } finally {
      clearTimeout(timer);
    }
  }

  // ---- 2) Theresav fallback (sering 521) ----
  {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 40000);
    try {
      const headers = {
        'x-apikey': process.env.MUSIC_API_KEY || 'kenzie',
        accept: '*/*',
        'user-agent': 'Mozilla/5.0',
      };
      const fd = new FormData();
      fd.append('username', username);
      if (avatarUrl) fd.append('avatar', avatarUrl);
      let r = await fetch(THERESAV, { method: 'POST', body: fd, signal: ctl.signal, headers });
      if (r.status === 404 || r.status === 405) {
        r = await fetch(THERESAV + '?username=' + encodeURIComponent(username), {
          method: 'GET', signal: ctl.signal, headers,
        });
      }
      const buf = Buffer.from(await r.arrayBuffer());
      const ct = r.headers.get('content-type') || '';
      if (r.ok && isImageResponse(ct, buf)) {
        return res.status(200).setHeader('Content-Type', /image\//i.test(ct) ? ct : 'image/jpeg').send(buf);
      }
      errors.push('theresav: HTTP ' + r.status);
    } catch (e) {
      errors.push('theresav: ' + ((e && e.name === 'AbortError') ? 'timeout' : ((e && e.message) || 'error')));
    } finally {
      clearTimeout(timer);
    }
  }

  return res.status(502).json({
    ok: false,
    error: 'Gagal buat Fake Lobby FF',
    detail: errors.join(' | '),
  });
};

module.exports.config = { maxDuration: 60 };
