// GET /api/sms?action=countries|numbers|inbox
// Proxy → veepn.com/online-sms (nomor sementara publik)
const BASE = 'https://veepn.com/online-sms';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Gunakan GET' });

  const q = req.query || {};
  const action = String(q.action || 'countries').toLowerCase();
  const country = String(q.country || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const number = String(q.number || '').replace(/\D/g, '');
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const count = Math.min(50, Math.max(5, parseInt(q.count, 10) || 20));

  let url = '';
  if (action === 'countries') {
    url = BASE + '/countries/';
  } else if (action === 'numbers') {
    if (!country) return res.status(200).json({ ok: false, message: 'Parameter country wajib' });
    url = BASE + '/countries/' + encodeURIComponent(country) + '/';
  } else if (action === 'inbox') {
    if (!country || !number) return res.status(200).json({ ok: false, message: 'Parameter country & number wajib' });
    url = BASE + '/countries/' + encodeURIComponent(country) + '/' + encodeURIComponent(number) + '/?page=' + page + '&count=' + count;
  } else {
    return res.status(200).json({ ok: false, message: 'action: countries | numbers | inbox' });
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(url, {
      method: 'GET',
      signal: ctl.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 (compatible; KenziePreset/1.0)',
        referer: 'https://veepn.com/online-sms/',
      },
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    if (action === 'countries' && Array.isArray(data)) {
      const list = data
        .filter((x) => x && (x.online !== false))
        .map((x) => ({
          name: x.name || x.slug,
          slug: x.slug || x.name,
          locale: x.locale || x.name,
          iso: x.iso || '',
          dial: x.country || '',
          online: x.online !== false,
        }));
      return res.status(200).json({ ok: true, countries: list });
    }

    if (action === 'numbers' && Array.isArray(data)) {
      const list = data.map((x) => ({
        number: String(x.number || ''),
        full: String(x.full_number || x.code || x.number || ''),
        display: '+' + String(x.full_number || x.code || x.number || '').replace(/^\+/, ''),
        archived: !!x.is_archive,
        last: x.data_humans || '',
      }));
      return res.status(200).json({ ok: true, country, numbers: list });
    }

    if (action === 'inbox' && data && typeof data === 'object') {
      const msgs = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      const messages = msgs.map((m) => ({
        id: m.id,
        text: m.text || '',
        from: m.in_number || m.from || '-',
        code: m.code && m.code !== '-' ? String(m.code) : extractCode(m.text || ''),
        time: m.data_humans || m.created_at || '',
        at: m.created_at || '',
      }));
      return res.status(200).json({
        ok: true,
        country,
        number,
        page: data.current_page || page,
        messages,
      });
    }

    return res.status(200).json({
      ok: false,
      message: 'API SMS membalas format tidak dikenal (HTTP ' + r.status + ')',
      raw: (text || '').slice(0, 200),
    });
  } catch (e) {
    const why = e && e.name === 'AbortError' ? 'timeout' : (e && e.message) || 'unknown';
    return res.status(200).json({ ok: false, message: 'Gagal menghubungi API SMS (' + why + ')' });
  } finally {
    clearTimeout(timer);
  }
};

function extractCode(text) {
  const m = String(text).match(/\b(\d{4,8})\b/);
  return m ? m[1] : '';
}
