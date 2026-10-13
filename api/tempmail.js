// Vercel Serverless — Temp Mail proxy
// Pola Zetttools (generator.email) + domain brand @ryuze.xml
//
// GET /api/tempmail?action=generate              → email @ryuze.xml (alias)
// GET /api/tempmail?action=generate&raw=1       → email upstream asli
// GET /api/tempmail?action=domains|search|inbox|detail|uptime
//
// Alias: tampilan user@ryuze.xml, inbox tetap di upstream.
// Token memuat mapping upstream (tidak perlu database).
const UPSTREAM = 'https://zetttools.vercel.app/api/tempmail';
const BRAND_DOMAIN = 'ryuze.xml';

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

function randUser(len) {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let o = '';
  for (let i = 0; i < len; i++) o += abc[(Math.random() * abc.length) | 0];
  return o;
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
    // ---------- GENERATE (brand @ryuze.xml by default) ----------
    if (action === 'generate') {
      const wantRaw = q.raw === '1' || q.raw === 'true';
      const { r, text, data } = await upstreamGet({ action: 'generate' }, ctl.signal);
      if (!r.ok || !data || !data.email) {
        return res.status(r.ok ? 502 : r.status).json(
          data || { status: false, error: 'Gagal generate', raw: text.slice(0, 200) }
        );
      }

      const upUser = data.username || String(data.email).split('@')[0];
      const upDomain = data.domain || String(data.email).split('@')[1];
      const token = packToken(upUser, upDomain, data.api_token);

      if (wantRaw) {
        return res.status(200).json({
          status: 'success',
          ok: true,
          email: data.email,
          username: upUser,
          domain: upDomain,
          api_token: token,
          inbox_url: data.inbox_url || '',
          brand: false,
        });
      }

      // Brand: tampilan @ryuze.xml, mapping di token
      const brandUser = upUser || randUser(8);
      const brandEmail = brandUser + '@' + BRAND_DOMAIN;

      return res.status(200).json({
        status: 'success',
        ok: true,
        email: brandEmail,
        username: brandUser,
        domain: BRAND_DOMAIN,
        api_token: token,
        inbox_url: data.inbox_url || '',
        upstream_email: data.email,
        upstream_domain: upDomain,
        brand: true,
        note: 'Domain brand @' + BRAND_DOMAIN + ' — inbox via upstream generator.email',
      });
    }

    // ---------- DOMAINS: sisipkan ryuze.xml di depan ----------
    if (action === 'domains') {
      const { r, text, data } = await upstreamGet({ action: 'domains' }, ctl.signal);
      let list = Array.isArray(data) ? data.slice() : [];
      if (!list.includes(BRAND_DOMAIN)) list.unshift(BRAND_DOMAIN);
      if (!r.ok && !list.length) {
        return res.status(r.status).json(data || { status: false, raw: text.slice(0, 200) });
      }
      return res.status(200).json(list);
    }

    // ---------- SEARCH ----------
    if (action === 'search') {
      const qq = String(q.q || q.query || '').trim();
      const { r, text, data } = await upstreamGet({ action: 'search', q: qq }, ctl.signal);
      let list = Array.isArray(data) ? data.slice() : [];
      if (!qq || BRAND_DOMAIN.includes(qq.toLowerCase()) || 'ryuze'.includes(qq.toLowerCase())) {
        if (!list.includes(BRAND_DOMAIN)) list.unshift(BRAND_DOMAIN);
      }
      if (!r.ok && !list.length) {
        return res.status(r.status).json(data || { status: false, raw: text.slice(0, 200) });
      }
      return res.status(200).json(list);
    }

    // ---------- INBOX / DETAIL / UPTIME ----------
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

      // Resolve brand domain → upstream via token
      let upUser = user;
      let upDomain = domain;
      if (domain === BRAND_DOMAIN || (email && email.endsWith('@' + BRAND_DOMAIN))) {
        const map = unpackToken(token);
        if (!map) {
          return res.status(400).json({
            status: false,
            error: 'Untuk @' + BRAND_DOMAIN + ' sertakan api_token dari hasil generate',
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
      res.status(200);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.send(typeof data === 'object' && data !== null ? JSON.stringify(data) : text);
    }

    return res.status(400).json({
      status: false,
      error: 'action tidak dikenal',
      allow: ['generate', 'domains', 'search', 'inbox', 'detail', 'uptime'],
    });
  } catch (e) {
    const why = (e && e.name === 'AbortError') ? 'timeout' : ((e && e.message) || 'unknown');
    return res.status(502).json({ status: false, ok: false, error: 'Gagal temp mail (' + why + ')' });
  } finally {
    clearTimeout(timer);
  }
};

module.exports.config = { maxDuration: 30 };
