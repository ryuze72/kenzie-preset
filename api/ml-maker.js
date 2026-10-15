// Vercel Serverless — Fake Lobby ML (kartu lobby CLASSIC seperti in-game)
// POST /api/ml-maker  JSON: { avatar, username, rank?, border? }
// Prioritas: Nexray GET /maker/fakelobyml → Theresav POST /api/maker/fake/ml
const NEXRAY = 'https://api.nexray.eu.cc/maker/fakelobyml';
const THERESAV = 'https://api.theresav.eu/api/maker/fake/ml';
const LITTERBOX = 'https://litterbox.catbox.moe/resources/internals/api.php';

const RANK_MAP = {
  warrior: 'warrior', elite: 'elite', master: 'master',
  grandmaster: 'gm', gm: 'gm',
  epic: 'epic', legend: 'legend',
  mythic: 'mythic', myth: 'mythic',
  honor: 'honor', glory: 'glory', mythicalglory: 'glory',
  immortal: 'imo', imo: 'imo', mawi: 'mawi',
};

function normalizeRank(r) {
  const k = String(r || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!k) return 'glory';
  return RANK_MAP[k] || k || 'glory';
}

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
  const rank = normalizeRank(b.rank);
  const border = String(b.border || '').trim().slice(0, 40);

  const errors = [];
  let avatarUrl = isHttp ? rawAvatar : '';
  let avatarBuf = null;
  let avatarMime = 'image/png';
  let avatarExt = 'png';

  if (m) {
    avatarBuf = Buffer.from(m[2], 'base64');
    avatarMime = m[1];
    avatarExt = /jpe?g/i.test(m[1]) ? 'jpg' : /webp/i.test(m[1]) ? 'webp' : 'png';
  } else if (isHttp) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 20000);
      const r = await fetch(rawAvatar, { signal: ctl.signal, headers: { 'user-agent': 'Mozilla/5.0' } });
      clearTimeout(t);
      if (r.ok) {
        avatarBuf = Buffer.from(await r.arrayBuffer());
        const ct = (r.headers.get('content-type') || '').split(';')[0].trim();
        if (/^image\//i.test(ct)) avatarMime = ct;
        avatarExt = /jpe?g/i.test(avatarMime) ? 'jpg' : /webp/i.test(avatarMime) ? 'webp' : 'png';
      }
    } catch (e) {
      errors.push('fetch-avatar: ' + ((e && e.message) || 'gagal'));
    }
  }

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

  if (avatarUrl) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 50000);
    try {
      const qs = new URLSearchParams({
        avatar: avatarUrl,
        nickname: username,
        rank: rank,
        t: String(Date.now()),
      });
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
        res.setHeader('X-Fake-Source', 'nexray');
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

  if (avatarBuf) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 50000);
    try {
      const fd = new FormData();
      fd.append('avatar', new Blob([avatarBuf], { type: avatarMime }), 'avatar.' + avatarExt);
      fd.append('username', username);
      fd.append('rank', rank);
      if (border) fd.append('border', border);
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
        res.setHeader('X-Fake-Source', 'theresav');
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
    detail: errors.slice(0, 6),
  });
};
module.exports.config = { maxDuration: 60 };
