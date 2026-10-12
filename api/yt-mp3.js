// Vercel Serverless Function — unduh MP3 dari video YouTube (dipakai tombol MP3 di menu Musik).
// GET /api/yt-mp3?url=<link youtube>&bitrate=128k  →  https://api.theresav.eu/api/download/ytmp3
//  - bila API membalas file audio  : file diteruskan langsung (stream)
//  - bila API membalas JSON         : dikembalikan {ok:true, url:"<link mp3>"} untuk diunduh browser
// Key bawaan 'kenzie'; env MUSIC_API_KEY (Vercel) bila diisi akan dipakai.
const BASE = 'https://api.theresav.eu/api/download/ytmp3';
const DEFAULT_KEY = 'kenzie';
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
  const score = x => (/\.(mp3|m4a|opus|webm|ogg)(\?|#|$)/i.test(x.url) ? 0 : 5) + (PRIORITY.indexOf(x.key) >= 0 ? PRIORITY.indexOf(x.key) : 20) + (/thumb|image|cover|poster/i.test(x.key) ? 50 : 0);
  all.sort((a, b) => score(a) - score(b));
  return all[0] ? all[0].url : '';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = String((req.query && req.query.url) || '').trim();
  if (!/^https?:\/\/((www|m|music)\.)?(youtube\.com|youtu\.be)\//i.test(url)) return res.status(400).json({ ok: false, error: 'Parameter url harus link YouTube' });
  let br = String((req.query && req.query.bitrate) || '128k').trim();
  if (!/^\d{2,3}k$/.test(br)) br = '128k';

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 55000);
  try {
    const r = await fetch(BASE + '?url=' + encodeURIComponent(url) + '&format=mp3&bitrate=' + br, {
      method: 'GET', signal: ctl.signal,
      headers: { accept: '*/*', 'x-apikey': process.env.MUSIC_API_KEY || DEFAULT_KEY, 'user-agent': 'Mozilla/5.0' },
    });
    const ct = r.headers.get('content-type') || '';
    if (r.ok && /^audio\/|octet-stream/i.test(ct)) {
      res.status(200);
      res.setHeader('Content-Type', /^audio\//i.test(ct) ? ct : 'audio/mpeg');
      res.setHeader('Content-Disposition', 'attachment; filename="lagu.mp3"');
      const cl = r.headers.get('content-length'); if (cl) res.setHeader('Content-Length', cl);
      clearTimeout(timer); // header sudah diterima; lagu penuh di-stream tanpa batas 4,5 MB
      const { Readable } = require('stream');
      const { pipeline } = require('stream/promises');
      await pipeline(Readable.fromWeb(r.body), res);
      return;
    }
    const text = await r.text();
    let data = null; try { data = JSON.parse(text); } catch {}
    if (!r.ok) {
      const msg = data && typeof data === 'object' ? (data.error || data.message || data.detail) : '';
      return res.status(r.status).json({ ok: false, error: (typeof msg === 'string' && msg) || ('API membalas HTTP ' + r.status) });
    }
    const link = data ? pickUrl(data) : '';
    if (!link) return res.status(502).json({ ok: false, error: 'API tidak mengirim link MP3', raw: (data ? JSON.stringify(data) : text).slice(0, 300) });
    return res.status(200).json({ ok: true, url: link });
  } catch (e) {
    const why = (e && e.name === 'AbortError') ? 'timeout 55 detik' : ((e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown');
    return res.status(502).json({ ok: false, error: 'Gagal menghubungi API MP3 (' + why + ')' });
  } finally { clearTimeout(timer); }
};
module.exports.config = { maxDuration: 300 };
