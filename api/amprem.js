// Proxy to https://api.theresav.eu/api/premium/alightmotion
// send: GET /send?email=...
// verify: GET /verify?email=...&link=...&orderid=kenzie
// Header: x-apikey: kenzie
// Order ID selalu "kenzie" — wajib no error

const API_BASE = 'https://api.theresav.eu/api/premium/alightmotion';
const API_KEY = 'kenzie';
const ORDER_ID = 'kenzie';

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
  let link = String(b.magicLink || b.link || '').trim();

  if (!email || !email.includes('@')) {
    return res.status(200).json({ ok: false, message: 'Email tidak valid' });
  }

  if (action === 'verify') {
    const m = link.match(/https:\/\/alight-creative\.firebaseapp\.com\/__\/auth\/links\?[^\s\"'<>]+/i)
      || link.match(/https:\/\/alightcreative\.com\/auth_action\/?[^\s\"'<>]+/i)
      || link.match(/https?:\/\/[^\s\"'<>]*oobCode[^\s\"'<>]*/i);
    if (m) link = m[0].replace(/[.,;]+$/, '');
    if (!link || link.length < 40 || !/oobCode/i.test(link)) {
      return res.status(200).json({ ok: false, message: 'Link verifikasi tidak lengkap atau tidak berisi oobCode. Salin ulang dari inbox (harus diawali https://).' });
    }
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 28000);

  try {
    let url;
    if (action === 'send') {
      url = `${API_BASE}/send?email=${encodeURIComponent(email)}`;
    } else {
      url = `${API_BASE}/verify?email=${encodeURIComponent(email)}&link=${encodeURIComponent(link)}&orderid=${ORDER_ID}`;
    }

    const r = await fetch(url, {
      method: 'GET',
      signal: ctl.signal,
      headers: {
        'x-apikey': API_KEY,
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 (compatible; KenziePreset/1.0)',
      },
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    if (!data || typeof data !== 'object') {
      const snippet = (text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
      return res.status(200).json({
        ok: false,
        message: 'API membalas HTTP ' + r.status + (snippet ? ': ' + snippet : ' tanpa isi JSON'),
      });
    }

    const failed = data.status === false || data.success === false || data.ok === false || (data.error != null && String(data.error).trim() !== '');
    const ok = !failed && (data.status === true || data.success === true || data.ok === true);

    const response = {
      ok: !!ok,
      status: data.status,
      message: pickMsg(data) || (ok ? (action === 'verify' ? 'Premium aktif' : 'Link verifikasi berhasil dikirim') : 'Gagal'),
      creator: data.creator,
      data: data.data,
      usage: data.usage,
    };

    if (action === 'send' && ok) {
      // Dummy cookie untuk kompatibilitas frontend yang masih cek cookie
      response.cookie = 'compat-session=kenzie';
    }

    if (action === 'verify' && ok) {
      // Agar frontend yang cek premiumActive === true tidak anggap error
      response.premiumActive = true;
    }

    if (data.email) response.email = data.email;

    return res.status(200).json(response);
  } catch (e) {
    const why =
      e && e.name === 'AbortError'
        ? 'timeout 28 detik'
        : (e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown';
    return res.status(200).json({
      ok: false,
      message: 'Gagal menghubungi API AM Premium (' + why + ')',
    });
  } finally {
    clearTimeout(timer);
  }
};
