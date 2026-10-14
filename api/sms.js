// GET /api/sms?action=countries|numbers|inbox
// Proxy → smsdock.net
const BASE = 'https://smsdock.net';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCode(text) {
  const m = String(text).match(/\b(\d{4,8})\b/);
  return m ? m[1] : '';
}

function formatDisplay(full) {
  const d = String(full || '').replace(/\D/g, '');
  return d ? '+' + d : '';
}

function normalizeNumber(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('0') && d.length >= 10) d = '62' + d.slice(1);
  return d;
}

async function fetchText(url) {
  const r = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/json',
      'user-agent': UA,
      referer: BASE + '/',
      'accept-language': 'en-US,en;q=0.9,id;q=0.8',
    },
    signal: AbortSignal.timeout(22000),
  });
  return { r, text: await r.text() };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Gunakan GET' });

  const q = req.query || {};
  const action = String(q.action || 'countries').toLowerCase();
  const country = String(q.country || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const number = normalizeNumber(q.number || '');
  const page = Math.max(1, parseInt(q.page, 10) || 1);

  try {
    if (action === 'countries') {
      const { text } = await fetchText(BASE + '/');
      const slugs = [...new Set([...text.matchAll(/href="\/country\/([a-z0-9-]+)"/gi)].map((m) => m[1].toLowerCase()))];
      const list = slugs.map((slug) => ({
        name: slug,
        slug,
        locale: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        iso: '',
        dial: '',
        online: true,
      }));
      list.sort((a, b) => {
        if (a.slug === 'indonesia') return -1;
        if (b.slug === 'indonesia') return 1;
        return a.locale.localeCompare(b.locale);
      });
      return res.status(200).json({ ok: true, source: 'smsdock', countries: list });
    }

    if (action === 'numbers') {
      if (!country) return res.status(200).json({ ok: false, message: 'Parameter country wajib' });
      const { text } = await fetchText(BASE + '/country/' + encodeURIComponent(country));
      const list = [];
      const seen = new Set();
      const re = /href="\/number\/(\d+)"([\s\S]{0,500})/gi;
      let m;
      while ((m = re.exec(text))) {
        const full = m[1];
        if (seen.has(full)) continue;
        seen.add(full);
        const chunk = m[2] || '';
        const online = /live-dot[^"]*\bonline\b|\bOnline\b/i.test(chunk);
        const busy = /\bbusy\b/i.test(chunk);
        list.push({
          number: full,
          full,
          display: formatDisplay(full),
          archived: !online && !busy,
          last: online ? 'online' : busy ? 'busy' : '',
          rank: online ? 0 : busy ? 1 : 2,
        });
      }
      list.sort((a, b) => a.rank - b.rank);
      return res.status(200).json({ ok: true, source: 'smsdock', country, numbers: list });
    }

    if (action === 'inbox') {
      if (!number || number.length < 8) {
        return res.status(200).json({ ok: false, message: 'Nomor tidak valid. Pakai format 628xxx…' });
      }

      try {
        await fetch(BASE + '/number/' + encodeURIComponent(number), {
          headers: { 'user-agent': UA, accept: 'text/html', referer: BASE + '/' },
          signal: AbortSignal.timeout(12000),
        });
      } catch (_) {}

      const url = BASE + '/api/messages?number=' + encodeURIComponent(number);
      const r = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': UA,
          referer: BASE + '/number/' + number,
          'accept-language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(22000),
        cache: 'no-store',
      });
      const data = await r.json().catch(() => null);
      if (!data || data.ok === false) {
        return res.status(200).json({
          ok: false,
          message: (data && (data.message || data.error)) || 'Gagal ambil inbox dari SMSDock',
        });
      }
      const msgs = Array.isArray(data.messages) ? data.messages : [];
      const messages = msgs.map((m) => {
        const html = m.html || '';
        const sender = (html.match(/msg-sender[^>]*>([^<]+)/i) || [])[1] || '-';
        const time = (html.match(/msg-time[^>]*>([^<]+)/i) || [])[1] || '';
        const codeIn = (html.match(/class="code"[^>]*>(\d{4,8})</i) || [])[1] || '';
        const textPart = (html.match(/msg-text[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || html;
        const text = stripHtml(textPart);
        return {
          id: m.id,
          text,
          from: stripHtml(sender),
          code: codeIn || extractCode(text),
          time: stripHtml(time),
          at: m.ts ? new Date(Number(m.ts) * 1000).toISOString() : '',
          ts: m.ts || 0,
        };
      });
      messages.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      return res.status(200).json({
        ok: true,
        source: 'smsdock',
        country,
        number,
        page,
        online: !!data.online,
        status: data.status || '',
        serverTime: data.serverTime || null,
        total: messages.length,
        messages,
      });
    }

    return res.status(200).json({ ok: false, message: 'action: countries | numbers | inbox' });
  } catch (e) {
    const why = e && (e.name === 'TimeoutError' || e.name === 'AbortError') ? 'timeout' : (e && e.message) || 'unknown';
    return res.status(200).json({ ok: false, message: 'Gagal menghubungi SMSDock (' + why + ')' });
  }
};
