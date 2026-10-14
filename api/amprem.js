// POST /api/amprem?action=send|verify → api.theresav.eu alightmotion
const BASE = 'https://api.theresav.eu/api/premium/alightmotion/';
const API_KEY = process.env.AM_API_KEY || 'kenzie';

function pickMsg(data) {
  if (!data || typeof data !== 'object') return '';
  const v = data.message || data.error || data.detail || data.msg || data.reason;
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    return String(v.message || v.error || v.msg || JSON.stringify(v).slice(0, 200));
  }
  return String(v);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const action = String((req.query && req.query.action) || '');
  if (action !== 'send' && action !== 'verify') {
    return res.status(404).json({ ok: false, message: 'Endpoint tidak dikenal' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Gunakan POST' });
  }

  let b = req.body;
  if (typeof b === 'string') {
    try { b = JSON.parse(b); } catch { b = {}; }
  }
  b = b || {};
  const email = String(b.email || '').trim();
  let link = String(b.link || '').trim();

  if (!email || !email.includes('@')) {
    return res.status(200).json({ ok: false, message: 'Email tidak valid' });
  }
  if (action === 'verify') {
    const m = link.match(/https:\/\/alight-creative\.firebaseapp\.com\/__\/auth\/links\?[^\s"'<>]+/i)
      || link.match(/https:\/\/alightcreative\.com\/auth_action\/?[^\s"'<>]+/i)
      || link.match(/https?:\/\/[^\s"'<>]*oobCode[^\s"'<>]*/i);
    if (m) link = m[0].replace(/[.,;]+$/, '');
    if (!link || link.length < 40) {
      return res.status(200).json({ ok: false, message: 'Link verifikasi tidak lengkap. Salin ulang dari inbox (harus diawali https://).' });
    }
    if (!/oobCode/i.test(link)) {
      return res.status(200).json({ ok: false, message: 'Link tidak berisi oobCode. Ambil lagi dari email Alight Creative.' });
    }
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    let qs = 'email=' + encodeURIComponent(email);
    if (action === 'send') {
      qs += '&lang=en&language=en&locale=en';
    }
    if (action === 'verify') {
      qs += '&link=' + encodeURIComponent(link);
    }
    const r = await fetch(BASE + action + '?' + qs, {
      method: 'GET',
      signal: ctl.signal,
      headers: {
        accept: 'application/json',
        'x-apikey': API_KEY,
        'user-agent': 'Mozilla/5.0 (compatible; KenziePreset/1.0)',
      },
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const failed =
        data.status === false ||
        data.success === false ||
        data.ok === false ||
        (data.error != null && data.error !== '') ||
        /^(error|fail)/i.test(String(data.status || ''));
      const ok = !failed && (data.ok === true || data.status === true || data.success === true || (r.ok && data.error == null));
      data.ok = !!ok;
      if (!data.message) data.message = pickMsg(data) || (ok ? 'Berhasil' : 'Gagal');
      return res.status(200).json(data);
    }

    const snippet = (text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    return res.status(200).json({
      ok: false,
      message: 'API membalas HTTP ' + r.status + (snippet ? ': ' + snippet : ' tanpa isi JSON'),
    });
  } catch (e) {
    const why =
      e && e.name === 'AbortError'
        ? 'timeout 25 detik'
        : (e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown';
    return res.status(200).json({
      ok: false,
      message: 'Gagal menghubungi API AM Premium (' + why + ')',
    });
  } finally {
    clearTimeout(timer);
  }
};
