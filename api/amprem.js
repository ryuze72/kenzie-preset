// Proxy ke API baru theresav.eu
// Order ID selalu "kenzie"
// Pesan sukses menekankan bahwa user HARUS refresh/logout di app AM

const API_BASE = 'https://api.theresav.eu/api/premium/alightmotion';
const API_KEY = 'kenzie';
const ORDER_ID = 'kenzie';

function pickMsg(data) {
  if (!data || typeof data !== 'object') return '';
  const v = data.message || data.error || data.detail || data.msg || data.reason;
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'object') return String(v.message || v.error || v.msg || JSON.stringify(v).slice(0, 180));
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

  let b = req.body || {};
  if (typeof b === 'string') {
    try { b = JSON.parse(b); } catch { b = {}; }
  }
  const email = String(b.email || '').trim();
  let link = String(b.magicLink || b.link || '').trim();

  if (!email || !email.includes('@')) {
    return res.status(200).json({ ok: false, message: 'Email tidak valid' });
  }

  if (action === 'verify') {
    const m = link.match(/https:\/\/alight-creative\.firebaseapp\.com\/__\/auth\/links\?[^\s"'<>]+/i)
      || link.match(/https:\/\/alightcreative\.com\/auth_action\/?[^\s"'<>]+/i)
      || link.match(/https?:\/\/[^\s"'<>]*oobCode[^\s"'<>]*/i);
    if (m) link = m[0].replace(/[.,;]+$/, '');
    if (!link || link.length < 40 || !/oobCode/i.test(link)) {
      return res.status(200).json({ ok: false, message: 'Link verifikasi tidak lengkap atau tidak berisi oobCode. Salin ulang dari inbox.' });
    }
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 28000);

  try {
    const url = action === 'send'
      ? `${API_BASE}/send?email=${encodeURIComponent(email)}`
      : `${API_BASE}/verify?email=${encodeURIComponent(email)}&link=${encodeURIComponent(link)}&orderid=${ORDER_ID}`;

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
      return res.status(200).json({
        ok: false,
        message: 'API membalas non-JSON (HTTP ' + r.status + ')',
        raw: text.slice(0, 200),
      });
    }

    const failed = data.status === false || data.success === false || (data.error && String(data.error).trim());
    const ok = !failed && (data.status === true || data.success === true);

    let message = pickMsg(data);
    if (ok && action === 'verify') {
      message = 'Verifikasi diterima oleh server. WAJIB: Buka Alight Motion → My Account → tekan Refresh. Kalau masih belum, Logout → Login ulang dengan email yang sama, lalu tunggu 1-2 menit. Status premium kadang butuh sync manual.';
    } else if (ok && action === 'send') {
      message = message || 'Link berhasil dikirim. Cek inbox (termasuk spam) lalu verifikasi.';
    } else if (!message) {
      message = ok ? 'Berhasil' : 'Gagal';
    }

    const response = {
      ok: !!ok,
      status: data.status,
      message,
      creator: data.creator,
      data: data.data,
      usage: data.usage,
      upstream: data,
    };

    if (action === 'send' && ok) response.cookie = 'compat-session=kenzie';
    if (action === 'verify' && ok) response.premiumActive = true;

    return res.status(200).json(response);
  } catch (e) {
    const why = e.name === 'AbortError' ? 'timeout' : (e.message || 'unknown');
    return res.status(200).json({ ok: false, message: 'Gagal hubungi API: ' + why });
  } finally {
    clearTimeout(timer);
  }
};
