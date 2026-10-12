// Vercel Serverless Function — unduh MP3 dari video YouTube (tombol MP3 di menu Musik).
// GET /api/yt-mp3?url=<youtube>&bitrate=128k
// Provider (berurutan, fallback otomatis):
//   1. Nexray  https://api.nexray.eu.cc/downloader/v1/ytmp3
//   2. theresav https://api.theresav.eu/api/download/ytmp3
// Response: stream audio ATAU {ok:true, url:"..."}
const PROVIDERS = [
  {
    name: 'nexray',
    build: (url) => 'https://api.nexray.eu.cc/downloader/v1/ytmp3?url=' + encodeURIComponent(url),
    headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' },
  },
  {
    name: 'theresav',
    build: (url, br) => 'https://api.theresav.eu/api/download/ytmp3?url=' + encodeURIComponent(url) + '&format=mp3&bitrate=' + br,
    headers: { accept: '*/*', 'x-apikey': process.env.MUSIC_API_KEY || 'kenzie', 'user-agent': 'Mozilla/5.0' },
  },
];

const PRIORITY = ['download_url', 'downloadUrl', 'download', 'dl', 'mp3', 'audio', 'file', 'url', 'link', 'result', 'data'];

function collectUrls(o, key, out, d) {
  if (o == null || d > 6) return out;
  if (typeof o === 'string') { if (/^https?:\/\//i.test(o)) out.push({ key, url: o }); }
  else if (Array.isArray(o)) o.forEach(x => collectUrls(x, key, out, d + 1));
  else if (typeof o === 'object') Object.keys(o).forEach(k => collectUrls(o[k], k, out, d + 1));
  return out;
}
function pickUrl(data) {
  const all = collectUrls(data, '', [], 0);
  const score = x => (/\.(mp3|m4a|opus|webm|ogg)(\?|#|$)/i.test(x.url) ? 0 : 5)
    + (PRIORITY.indexOf(x.key) >= 0 ? PRIORITY.indexOf(x.key) : 20)
    + (/thumb|image|cover|poster|avatar|logo/i.test(x.key) ? 50 : 0);
  all.sort((a, b) => score(a) - score(b));
  return all[0] ? all[0].url : '';
}
function errMsg(data, text, status) {
  if (data && typeof data === 'object') {
    const m = data.error || data.message || data.detail || data.msg;
    if (typeof m === 'string' && m) return m.slice(0, 220);
  }
  if (typeof text === 'string' && text && text.length < 200) return text;
  return 'API membalas HTTP ' + status;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = String((req.query && req.query.url) || '').trim();
  if (!/^https?:\/\/((www|m|music)\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
    return res.status(400).json({ ok: false, error: 'Parameter url harus link YouTube' });
  }
  let br = String((req.query && req.query.bitrate) || '128k').trim();
  if (!/^\d{2,3}k$/.test(br)) br = '128k';

  const errors = [];
  for (const p of PROVIDERS) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 50000);
    try {
      const r = await fetch(p.build(url, br), {
        method: 'GET', signal: ctl.signal, headers: p.headers,
      });
      const ct = r.headers.get('content-type') || '';

      // Binary audio stream
      if (r.ok && /^audio\/|octet-stream/i.test(ct)) {
        res.status(200);
        res.setHeader('Content-Type', /^audio\//i.test(ct) ? ct : 'audio/mpeg');
        res.setHeader('Content-Disposition', 'attachment; filename="lagu.mp3"');
        const cl = r.headers.get('content-length');
        if (cl) res.setHeader('Content-Length', cl);
        clearTimeout(timer);
        const { Readable } = require('stream');
        const { pipeline } = require('stream/promises');
        await pipeline(Readable.fromWeb(r.body), res);
        return;
      }

      const text = await r.text();
      let data = null;
      try { data = JSON.parse(text); } catch {}

      if (!r.ok || (data && data.status === false)) {
        errors.push(p.name + ': ' + errMsg(data, text, r.status));
        continue;
      }

      const link = data ? pickUrl(data) : '';
      if (!link) {
        errors.push(p.name + ': tidak ada link MP3');
        continue;
      }
      clearTimeout(timer);
      return res.status(200).json({ ok: true, url: link, provider: p.name });
    } catch (e) {
      const why = (e && e.name === 'AbortError') ? 'timeout'
        : ((e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown');
      errors.push(p.name + ': ' + why);
    } finally {
      clearTimeout(timer);
    }
  }

  return res.status(502).json({
    ok: false,
    error: 'Semua provider unduh MP3 gagal. Coba lagi nanti.',
    detail: errors.slice(0, 4),
  });
};
module.exports.config = { maxDuration: 300 };
