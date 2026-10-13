// Vercel Serverless Function — Fake Lobby Free Fire.
// POST /api/ff-maker  body JSON: { avatar?:"data:image/...;base64,..."|"https://...", username }
// Avatar opsional (Nexray tetap jalan tanpa foto). Bila data-URL → upload Litterbox dulu.
const NEXRAY = 'https://api.nexray.eu.cc/maker/fakelobyff';
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

  const username = String(b.username || '').trim().slice(0, 40);
  if (!username) return res.status(400).json({ ok: false, error: 'Username wajib diisi' });

  const rawAvatar = String(b.avatar || '').trim();
  const m = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(rawAvatar);
  const isHttp = /^https?:\/\//i.test(rawAvatar);

  let avatarUrl = isHttp ? rawAvatar : '';
  if (m && !avatarUrl) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 25000);
    try {
      const buf = Buffer.from(m[2], 'base64');
      const mime = m[1];
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
      avatarUrl = await hostAvatar(buf, mime, ext, ctl.signal);
    } catch (e) {
      // avatar opsional — lanjut tanpa foto
      avatarUrl = '';
    } finally {
      clearTimeout(timer);
    }
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 50000);
  try {
    const qs = new URLSearchParams({ nickname: username, t: String(Date.now()) });
    if (avatarUrl) qs.set('avatar', avatarUrl);
    const r = await fetch(NEXRAY + '?' + qs.toString(), {
      method: 'GET',
      signal: ctl.signal,
      headers: { accept: 'image/*,application/json,*/*', 'user-agent': 'Mozilla/5.0' },
    });
    const ct = r.headers.get('content-type') || '';
    const buf = Buffer.from(await r.arrayBuffer());
    if (r.ok && (/^image\//i.test(ct) || buf[0] === 0x89 || buf[0] === 0xff)) {
      res.status(200);
      res.setHeader('Content-Type', /^image\//i.test(ct) ? ct : 'image/jpeg');
      res.setHeader('Cache-Control', 'no-store');
      return res.send(buf);
    }
    let msg = 'HTTP ' + r.status;
    try {
      const j = JSON.parse(buf.toString('utf8'));
      msg = j.error || j.message || msg;
    } catch {}
    return res.status(502).json({ ok: false, error: 'Gagal membuat Fake Lobby FF: ' + msg });
  } catch (e) {
    const why = (e && e.name === 'AbortError') ? 'timeout' : ((e && e.message) || 'unknown');
    return res.status(502).json({ ok: false, error: 'Gagal menghubungi API FF (' + why + ')' });
  } finally {
    clearTimeout(timer);
  }
};
module.exports.config = { maxDuration: 60 };
