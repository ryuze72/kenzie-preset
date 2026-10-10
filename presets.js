// Vercel Serverless Function: /api/presets
// Menyimpan preset ke database Supabase (Postgres) lewat REST.
// Environment variables (Vercel > Settings > Environment Variables):
//   SUPABASE_URL          contoh: https://abcd1234.supabase.co
//   SUPABASE_SERVICE_KEY  service_role key (rahasia, hanya dipakai di server ini)
//   ADMIN_PASSWORD        password admin, dicek di server (bukan di halaman web)

const crypto = require('crypto');

const SHARE_RE = /^https?:\/\/(www\.)?alightcreative\.com\/am\/share\/\S+$/i;
const URL_RE = /^https?:\/\/\S+$/i;
const ID_RE = /^RYZ-\d{1,6}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function digest(v) { return crypto.createHash('sha256').update(String(v)).digest(); }
function isAdmin(req) {
  const pw = req.headers['x-admin-password'];
  const real = process.env.ADMIN_PASSWORD;
  return !!real && typeof pw === 'string' && crypto.timingSafeEqual(digest(pw), digest(real));
}
function fail(status, message) { const e = new Error(message); e.status = status; return e; }

async function sb(path, opts = {}) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw fail(500, 'Database belum dikonfigurasi');
  const res = await fetch(url.replace(/\/$/, '') + '/rest/v1/' + path, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {})
    }
  });
  const text = await res.text();
  if (!res.ok) {
    const e = new Error('Database error');
    e.status = res.status === 409 ? 409 : 502;
    e.detail = text;
    throw e;
  }
  return text ? JSON.parse(text) : null;
}

function fromRow(r) {
  return {
    id: r.id, name: r.name, creator: r.creator, category: r.category || 'XML',
    description: r.description || '', link: r.link || '', thumb: r.thumb || '',
    xmlUrl: r.xml_url || '', trending: !!r.trending, popular: !!r.popular, date: r.date || ''
  };
}

// Validasi input. create=true: nama & kreator wajib.
function build(body, create) {
  const row = {};
  const text = (k, max, required) => {
    if (body[k] === undefined) {
      if (required && create) throw fail(400, k + ' wajib diisi');
      return undefined;
    }
    const v = String(body[k] == null ? '' : body[k]).trim();
    if (required && !v) throw fail(400, k + ' wajib diisi');
    if (v.length > max) throw fail(400, k + ' terlalu panjang');
    return v;
  };
  const put = (col, v) => { if (v !== undefined) row[col] = v; };
  put('name', text('name', 120, true));
  put('creator', text('creator', 80, true));
  put('category', text('category', 30));
  put('description', text('description', 2000));
  const link = text('link', 1000);
  if (link && !SHARE_RE.test(link)) throw fail(400, 'Link harus link share Alight Motion');
  put('link', link);
  const thumb = text('thumb', 1000);
  if (thumb && !URL_RE.test(thumb)) throw fail(400, 'Thumbnail harus link http(s)');
  put('thumb', thumb);
  const xml = text('xmlUrl', 1000);
  if (xml && !URL_RE.test(xml)) throw fail(400, 'Link XML harus http(s)');
  put('xml_url', xml);
  if (body.trending !== undefined) row.trending = !!body.trending;
  if (body.popular !== undefined) row.popular = !!body.popular;
  return row;
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    // Publik: daftar preset
    if (req.method === 'GET') {
      const rows = await sb('presets?select=*&order=date.desc,id.desc');
      res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30');
      return send(res, 200, rows.map(fromRow));
    }

    // Selebihnya hanya admin
    if (!isAdmin(req)) {
      await new Promise(r => setTimeout(r, 400));
      return send(res, 401, { error: 'Password salah' });
    }

    if (req.method === 'POST' && q.op === 'login') return send(res, 200, { ok: true });

    const today = new Date().toISOString().slice(0, 10);

    if (req.method === 'POST') {
      const row = build(body, true);
      if (body.id !== undefined) {
        // Pindahan data lama: ID dan tanggal dipertahankan (upsert)
        if (!ID_RE.test(String(body.id))) throw fail(400, 'ID tidak valid');
        row.id = String(body.id);
        row.date = DATE_RE.test(String(body.date || '')) ? body.date : today;
        const rows = await sb('presets', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(row) });
        return send(res, 200, fromRow(rows[0]));
      }
      row.date = today;
      for (let i = 0; i < 4; i++) {
        const ids = await sb('presets?select=id');
        const max = ids.reduce((m, r) => Math.max(m, parseInt(String(r.id).replace('RYZ-', ''), 10) || 0), 0);
        row.id = 'RYZ-' + String(max + 1 + i).padStart(3, '0');
        try {
          const rows = await sb('presets', { method: 'POST', body: JSON.stringify(row) });
          return send(res, 200, fromRow(rows[0]));
        } catch (e) { if (e.status !== 409) throw e; }
      }
      throw fail(409, 'Gagal membuat ID baru, coba lagi');
    }

    const id = String(q.id || '');
    if (!ID_RE.test(id)) throw fail(400, 'ID tidak valid');

    if (req.method === 'PUT') {
      const row = build(body, false);
      if (!Object.keys(row).length) throw fail(400, 'Tidak ada data yang diubah');
      const rows = await sb('presets?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(row) });
      if (!rows || !rows.length) throw fail(404, 'Preset tidak ditemukan');
      return send(res, 200, fromRow(rows[0]));
    }

    if (req.method === 'DELETE') {
      await sb('presets?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
      return send(res, 200, { ok: true });
    }

    throw fail(405, 'Metode tidak didukung');
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error('[api/presets]', e.message, e.detail || '');
    return send(res, status === 502 ? 502 : status, { error: status >= 500 ? (e.message === 'Database belum dikonfigurasi' ? e.message : 'Terjadi kesalahan pada database') : e.message });
  }
};
