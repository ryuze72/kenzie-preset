// POST /api/amprem?action=send|verify → am.noxxyrorr.biz.id/api
// /send-link + /verify-link (POST JSON, cookie dari step 1)
// customOrderId hanya kalau VIP key valid; kalau VIP ditolak, retry tanpa customOrderId
const BASE = 'https://am.noxxyrorr.biz.id/api';
const ORIGIN = 'https://am.noxxyrorr.biz.id';
const DEFAULT_ORDER_ID = process.env.AM_ORDER_ID || 'Kenzie';
const VIP_KEY = process.env.AM_VIP_KEY || 'F4YK4L-200-C35C-16E1';

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

/**
 * Normalize upstream response.
 * - send: boleh sukses kalau status/ok/success true (cookie didapat)
 * - verify: HANYA sukses kalau premiumActive === true (jangan bohong ke user)
 */
function normalizeUpstream(data, r, action) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  const failed =
    data.status === false ||
    data.success === false ||
    data.ok === false ||
    data.premiumActive === false ||
    data.authenticated === false ||
    (data.error != null && data.error !== '') ||
    /^(error|fail)/i.test(String(data.status || ''));

  let ok = false;
  if (action === 'verify') {
    // Ketat: hanya bila server benar-benar mengaktifkan premium
    ok = !failed && data.premiumActive === true;
  } else {
    // send: cukup response sukses + (idealnya) cookie
    ok =
      !failed &&
      (data.ok === true ||
        data.success === true ||
        data.status === true ||
        (r.ok && data.error == null && data.message && /berhasil|sukses|success|terkirim|sent/i.test(String(data.message))));
  }

  data.ok = !!ok;
  if (!data.message) {
    data.message = pickMsg(data) || (ok ? (action === 'verify' ? 'Premium aktif' : 'Berhasil') : 'Gagal');
  }
  return data;
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
  const cookie = String(b.cookie || '').trim();
  const customOrderId = String(b.customOrderId || '').trim() || DEFAULT_ORDER_ID;
  const vipKey = String(b.vipKey || '').trim() || VIP_KEY;
  let link = String(b.magicLink || b.link || '').trim();

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
    if (!cookie) {
      return res.status(200).json({ ok: false, message: 'Cookie dari step /send wajib diisi. Jalankan ulang send lalu salin cookie dari respons.' });
    }
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 28000);

  async function callUpstream(payload, withVip) {
    const path = action === 'send' ? 'send-link' : 'verify-link';
    const headers = {
      'Content-Type': 'application/json',
      accept: 'application/json',
      Origin: ORIGIN,
      Referer: ORIGIN + '/',
      'user-agent': 'Mozilla/5.0 (compatible; KenziePreset/1.0)',
    };
    if (withVip && vipKey) headers['X-VIP-Key'] = vipKey;
    const r = await fetch(`${BASE}/${path}`, {
      method: 'POST',
      signal: ctl.signal,
      headers,
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    return { r, text, data };
  }

  try {
    if (action === 'send') {
      const { r, text, data } = await callUpstream({ email }, false);
      const norm = normalizeUpstream(data, r, 'send');
      if (norm) {
        if (!norm.cookie) {
          const setCookie = r.headers.get('set-cookie');
          if (setCookie) norm.cookie = setCookie.split(';')[0];
        }
        return res.status(200).json(norm);
      }
      const snippet = (text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
      return res.status(200).json({
        ok: false,
        message: 'API membalas HTTP ' + r.status + (snippet ? ': ' + snippet : ' tanpa isi JSON'),
      });
    }

    // VERIFY: coba dulu dengan VIP + customOrderId, kalau VIP error → retry tanpa customOrderId
    let { r, text, data } = await callUpstream(
      { email, cookie, magicLink: link, customOrderId, vipKey },
      true
    );

    const isVipBlock =
      data &&
      (data.isVipError === true ||
        /kunci vip|custom order id|pengguna vip|x-vip-key|vipkey/i.test(String(data.message || data.error || '')));

    if (isVipBlock) {
      // Fallback: aktivasi biasa tanpa custom order id (tanpa VIP)
      ({ r, text, data } = await callUpstream(
        { email, cookie, magicLink: link },
        false
      ));
    }

    const norm = normalizeUpstream(data, r, 'verify');
    if (norm) {
      // Extra safety: kalau premiumActive explicit false / undefined setelah normalize
      if (data && data.premiumActive !== true) {
        norm.ok = false;
        if (data.premiumActive === false) {
          norm.message =
            pickMsg(data) ||
            'Verifikasi diterima tapi premium belum aktif di server. Coba logout/login Alight Motion, atau kirim ulang magic link.';
        } else {
          norm.message =
            pickMsg(data) ||
            'Verifikasi selesai, tapi status premium belum terkonfirmasi (premiumActive tidak true). Cek di app AM atau coba lagi.';
        }
      }
      return res.status(200).json(norm);
    }

    const snippet = (text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    return res.status(200).json({
      ok: false,
      message: 'API membalas HTTP ' + r.status + (snippet ? ': ' + snippet : ' tanpa isi JSON'),
    });
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
