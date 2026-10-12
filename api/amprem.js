// Satu file untuk dua endpoint: POST /api/send  dan  POST /api/verify
// (Vercel: [action] = send / verify). Meneruskan (GET) ke API AM Premium api.theresav.eu.
const BASE = 'https://api.theresav.eu/api/premium/alightmotion/';
const API_KEY = process.env.AM_API_KEY || 'kenzie';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const action = String((req.query && req.query.action) || '');
  if (action !== 'send' && action !== 'verify') return res.status(404).json({ ok: false, message: 'Endpoint tidak dikenal' });
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Gunakan POST' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const email = String(b.email || '').trim();
  const payload = action === 'send' ? { email } : { email, link: String(b.link || '').trim() };

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  try {
    const qs = '?email=' + encodeURIComponent(email) + (action === 'verify' ? '&link=' + encodeURIComponent(payload.link) : '');
    const r = await fetch(BASE + action + qs, {
      method: 'GET', signal: ctl.signal,
      headers: { accept: 'application/json', 'x-apikey': API_KEY, 'user-agent': 'Mozilla/5.0' },
    });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = null; }
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (data.ok === undefined) data.ok = r.ok && data.error == null && data.success !== false && data.status !== false && !/^(error|fail)/i.test(String(data.status || ''));
      if (!data.message && data.result) data.message = typeof data.result === 'string' ? data.result : (data.result.message || data.result.msg || undefined);
      if (!data.message && data.msg) data.message = data.msg;
      for (const k of ['message', 'error']) if (data[k] && typeof data[k] === 'object') data[k] = JSON.stringify(data[k]).slice(0, 300);
      return res.status(r.status).json(data);
    }
    const snippet = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    res.status(r.ok ? 502 : r.status).json({ ok: false, message: 'API membalas HTTP ' + r.status + (snippet ? ': ' + snippet : ' tanpa isi') });
  } catch (e) {
    const why = (e && e.name === 'AbortError') ? 'timeout 20 detik' : ((e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown');
    res.status(502).json({ ok: false, message: 'Gagal menghubungi API AM Premium (' + why + ')' });
  } finally { clearTimeout(timer); }
};
