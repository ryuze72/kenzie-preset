// Vercel Serverless — Temp Mail proxy
// Pola Zetttools (generator.email) + domain brand (display only).
// PENTING: field "email" = alamat YANG BISA MENERIMA surat (upstream).
// "brand_email" = tampilan @kenzie.prst / @ryuze.xml (TIDAK bisa menerima).
const UPSTREAM = 'https://zetttools.vercel.app/api/tempmail';
const BRANDS = {
  'ryuze.xml': { tag: 'ryuze' },
  'kenzie.prst': { tag: 'kenzie' },
};
const BRAND_LIST = Object.keys(BRANDS);

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

function b64url(s) {
  return Buffer.from(String(s), 'utf8').toString('base64url');
}
function fromB64url(s) {
  try { return Buffer.from(String(s), 'base64url').toString('utf8'); } catch { return ''; }
}

function randChars(len) {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let o = '';
  for (let i = 0; i < len; i++) o += abc[(Math.random() * abc.length) | 0];
  return o;
}

function brandUsername(tag) {
  const t = String(tag || 'ryuze').toLowerCase();
  const styles = [
    () => t + randChars(5),
    () => t + randChars(4) + ((Math.random() * 90 + 10) | 0),
    () => t + '_' + randChars(6),
    () => randChars(3) + t + randChars(3),
    () => t + ((Math.random() * 9000 + 1000) | 0),
  ];
  return styles[(Math.random() * styles.length) | 0]();
}

function pickBrandDomain(requested) {
  const d = String(requested || '').trim().toLowerCase();
  if (d && BRANDS[d]) return d;
  return BRAND_LIST[(Math.random() * BRAND_LIST.length) | 0];
}

function isBrandDomain(d) {
  return !!(d && BRANDS[String(d).toLowerCase()]);
}

function packToken(upstreamUser, upstreamDomain, apiToken) {
  return b64url(JSON.stringify({
    u: upstreamUser,
    d: upstreamDomain,
    t: apiToken || '',
    v: 1,
  }));
}

function unpackToken(token) {
  if (!token) return null;
  try {
    const j = JSON.parse(fromB64url(token));
    if (j && j.u && j.d) return j;
  } catch {}
  return null;
}

async function upstreamGet(params, signal) {
  const qs = new URLSearchParams(params);
  qs.set('_t', String(Date.now()));
  const r = await fetch(UPSTREAM + '?' + qs.toString(), {
    method: 'GET',
    signal,
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'Mozilla/5.0 (compatible; KenziePreset/1.0)',
    },
  });
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { r, text, data };
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ status: false, error: 'Gunakan GET' });

  const q = req.query || {};
  let action = String(q.action || 'generate').toLowerCase().trim();
  if (action === 'create' || action === 'new') action = 'generate';

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);

  try {
    if (action === 'generate') {
      const forceBrand = q.brand === '1' || q.brand === 'true';
      const { r, text, data } = await upstreamGet({ action: 'generate' }, ctl.signal);
      if (!r.ok || !data || !data.email) {
        return res.status(r.ok ? 502 : r.status).json(
          data || { status: false, error: 'Gagal generate', raw: text.slice(0, 200) }
        );
      }

      const upUser = data.username || String(data.email).split('@')[0];
      const upDomain = data.domain || String(data.email).split('@')[1];
      const token = packToken(upUser, upDomain, data.api_token);

      const brandDomain = pickBrandDomain(q.domain);
      const tag = BRANDS[brandDomain].tag;
      const brandUser = brandUsername(tag);
      const brandEmail = brandUser + '@' + brandDomain;

      // Default: email = alamat NYATA yang bisa menerima (upstream)
      // brand_email = kosmetik saja
      return res.status(200).json({
        status: 'success',
        ok: true,
        email: data.email,
        username: upUser,
        domain: upDomain,
        api_token: token,
        inbox_url: data.inbox_url || '',
        brand_email: brandEmail,
        brand_domain: brandDomain,
        brand: true,
        note: 'Pakai field email untuk kirim/terima. brand_email hanya tampilan (tidak punya MX).',
      });
    }

    if (action === 'domains') {
      const { r, text, data } = await upstreamGet({ action: 'domains' }, ctl.signal);
      let list = Array.isArray(data) ? data.slice() : [];
      for (let i = BRAND_LIST.length - 1; i >= 0; i--) {
        const b = BRAND_LIST[i];
        if (!list.includes(b)) list.unshift(b);
      }
      if (!r.ok && list.length === BRAND_LIST.length) {
        return res.status(r.status).json(data || { status: false, raw: text.slice(0, 200) });
      }
      return res.status(200).json(list);
    }

    if (action === 'search') {
      const qq = String(q.q || q.query || '').trim().toLowerCase();
      const { r, text, data } = await upstreamGet({ action: 'search', q: qq }, ctl.signal);
      let list = Array.isArray(data) ? data.slice() : [];
      for (const b of BRAND_LIST) {
        const tag = BRANDS[b].tag;
        if (!qq || b.includes(qq) || tag.includes(qq)) {
          if (!list.includes(b)) list.unshift(b);
        }
      }
      if (!r.ok && !list.length) {
        return res.status(r.status).json(data || { status: false, raw: text.slice(0, 200) });
      }
      return res.status(200).json(list);
    }

    if (action === 'inbox' || action === 'detail' || action === 'uptime') {
      let domain = String(q.domain || '').trim();
      let user = String(q.user || q.username || '').trim();
      const email = String(q.email || '').trim();
      const token = String(q.token || q.api_token || '').trim();

      if (email && email.includes('@')) {
        const [u, d] = email.split('@');
        if (!user) user = u;
        if (!domain) domain = d;
      }

      let upUser = user;
      let upDomain = domain;
      const brandHit = isBrandDomain(domain) || (email && BRAND_LIST.some(b => email.toLowerCase().endsWith('@' + b)));
      if (brandHit) {
        const map = unpackToken(token);
        if (!map) {
          return res.status(400).json({
            status: false,
            error: 'Domain brand tidak menerima email. Generate ulang dan pakai alamat upstream (bukan @kenzie.prst/@ryuze.xml).',
          });
        }
        upUser = map.u;
        upDomain = map.d;
      }

      if (!upUser || !upDomain) {
        return res.status(400).json({ status: false, error: 'user & domain (atau email) wajib' });
      }

      const params = { action, user: upUser, domain: upDomain };
      if (action === 'detail' && q.link) params.link = String(q.link);

      const { r, text, data } = await upstreamGet(params, ctl.signal);
      if (!r.ok) {
        return res.status(r.status).json(
          data && typeof data === 'object'
            ? data
            : { status: false, error: 'Upstream HTTP ' + r.status, raw: text.slice(0, 200) }
        );
      }
      if (action === 'inbox') {
        const messages = Array.isArray(data) ? data
          : (data && (data.messages || data.inbox || data.emails || data.data)) || [];
        return res.status(200).json({ status: true, ok: true, messages: Array.isArray(messages) ? messages : [] });
      }
      res.status(200);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.send(typeof data === 'object' && data !== null ? JSON.stringify(data) : text);
    }

    return res.status(400).json({
      status: false,
      error: 'action tidak dikenal',
      allow: ['generate', 'domains', 'search', 'inbox', 'detail', 'uptime'],
      brands: BRAND_LIST,
    });
  } catch (e) {
    const why = (e && e.name === 'AbortError') ? 'timeout' : ((e && e.message) || 'unknown');
    return res.status(502).json({ status: false, ok: false, error: 'Gagal temp mail (' + why + ')' });
  } finally {
    clearTimeout(timer);
  }
};

module.exports.config = { maxDuration: 30 };
