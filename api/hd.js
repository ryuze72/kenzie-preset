// POST /api/hd — upscale foto via theresav
// Body JSON: { image: dataURL|httpURL, scale?: 2|4 }
// atau multipart field "image" + "scale"
const UPSTREAM = 'https://api.theresav.eu/api/tools/hd';
const API_KEY = process.env.AM_API_KEY || process.env.MUSIC_API_KEY || 'kenzie';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

function dataUrlToBuffer(dataUrl) {
  const m = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/i);
  if (!m) return null;
  return { mime: m[1] || 'image/png', buf: Buffer.from(m[2], 'base64') };
}

function extFromMime(mime) {
  if (/jpeg|jpg/i.test(mime)) return 'jpg';
  if (/webp/i.test(mime)) return 'webp';
  return 'png';
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ status: false, error: 'Gunakan POST' });

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 55000);

  try {
    let b = req.body;
    if (typeof b === 'string') {
      try { b = JSON.parse(b); } catch { b = {}; }
    }
    b = b || {};

    let scale = parseInt(b.scale, 10);
    if (![2, 3, 4].includes(scale)) scale = 4;

    const form = new FormData();
    form.append('scale', String(scale));

    const image = b.image || b.url || b.src || '';
    if (!image) {
      return res.status(400).json({ status: false, error: 'Kirim field image (data URL atau URL http)' });
    }

    if (/^data:/i.test(image)) {
      const parsed = dataUrlToBuffer(image);
      if (!parsed || !parsed.buf.length) {
        return res.status(400).json({ status: false, error: 'Data URL gambar tidak valid' });
      }
      if (parsed.buf.length > 8 * 1024 * 1024) {
        return res.status(400).json({ status: false, error: 'Gambar terlalu besar (max ~8MB base64)' });
      }
      const blob = new Blob([parsed.buf], { type: parsed.mime });
      form.append('image', blob, 'input.' + extFromMime(parsed.mime));
    } else if (/^https?:\/\//i.test(image)) {
      // theresav juga menerima URL di beberapa tools — kirim sebagai file dari fetch
      const ir = await fetch(image, { signal: ctl.signal, headers: { 'user-agent': 'Mozilla/5.0' } });
      if (!ir.ok) {
        return res.status(400).json({ status: false, error: 'Gagal unduh URL gambar (HTTP ' + ir.status + ')' });
      }
      const ab = await ir.arrayBuffer();
      const mime = ir.headers.get('content-type') || 'image/png';
      form.append('image', new Blob([ab], { type: mime }), 'input.' + extFromMime(mime));
    } else {
      return res.status(400).json({ status: false, error: 'image harus data URL atau http(s) URL' });
    }

    const r = await fetch(UPSTREAM, {
      method: 'POST',
      signal: ctl.signal,
      headers: {
        'x-apikey': API_KEY,
        'user-agent': 'Mozilla/5.0 (compatible; KenziePreset/1.0)',
      },
      body: form,
    });

    const ct = r.headers.get('content-type') || '';
    const buf = Buffer.from(await r.arrayBuffer());

    if (!r.ok) {
      let err = 'Upstream HTTP ' + r.status;
      try {
        const j = JSON.parse(buf.toString('utf8'));
        err = j.error || j.message || err;
      } catch {}
      return res.status(r.status >= 400 && r.status < 600 ? r.status : 502).json({ status: false, error: err });
    }

    if (/^image\//i.test(ct) || buf[0] === 0x89 || buf[0] === 0xff) {
      res.status(200);
      res.setHeader('Content-Type', ct && /^image\//i.test(ct) ? ct : 'image/png');
      res.setHeader('Content-Disposition', 'inline; filename="hd.png"');
      return res.send(buf);
    }

    // JSON response with url / base64
    try {
      const j = JSON.parse(buf.toString('utf8'));
      const url = j.url || j.result || (j.data && (j.data.url || j.data.image));
      if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
        const ir = await fetch(url, { signal: ctl.signal });
        const ib = Buffer.from(await ir.arrayBuffer());
        res.status(200);
        res.setHeader('Content-Type', ir.headers.get('content-type') || 'image/png');
        return res.send(ib);
      }
      if (typeof url === 'string' && /^data:image\//i.test(url)) {
        const parsed = dataUrlToBuffer(url);
        if (parsed) {
          res.status(200);
          res.setHeader('Content-Type', parsed.mime);
          return res.send(parsed.buf);
        }
      }
      return res.status(200).json(j);
    } catch {
      return res.status(502).json({ status: false, error: 'Respons HD tidak dikenali', raw: buf.toString('utf8').slice(0, 200) });
    }
  } catch (e) {
    const why = (e && e.name === 'AbortError') ? 'timeout' : ((e && e.message) || 'unknown');
    return res.status(502).json({ status: false, error: 'Gagal HD foto (' + why + ')' });
  } finally {
    clearTimeout(timer);
  }
};

module.exports.config = { maxDuration: 60 };
