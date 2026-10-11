// Vercel Serverless Function — Proxy API AM Premium
// POST /api/amprem?path=send   { email }
// POST /api/amprem?path=verify { email, link }
// GET  /api/amprem?path=status

const SEND_BASE = 'https://amrpem-ran.vercel.app/api/send';
const VERIFY_BASE = 'https://amprem-ran.vercel.app/api/verify';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const path = String((req.query && req.query.path) || '');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    let response;

    const headers = {
      accept: 'application/json',
      'user-agent': 'Mozilla/5.0'
    };

    // Cek status API
    if (req.method === 'GET' && path === 'status') {
      response = await fetch(VERIFY_BASE + 'status', {
        method: 'GET',
        headers,
        signal: controller.signal
      });
    }

    // Kirim magic link ke email
    else if (req.method === 'POST' && path === 'send') {
      let body = req.body;

      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }

      body = body || {};

      const email = String(body.email || '').trim();

      if (!email) {
        return res.status(400).json({
          ok: false,
          message: 'Email wajib diisi'
        });
      }

      response = await fetch(SEND_BASE + 'send', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email }),
        signal: controller.signal
      });
    }

    // Verifikasi dan aktivasi premium
    else if (req.method === 'POST' && path === 'verify') {
      let body = req.body;

      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }

      body = body || {};

      const email = String(body.email || '').trim();
      const link = String(body.link || '').trim();

      if (!email || !link) {
        return res.status(400).json({
          ok: false,
          message: 'Email dan link verifikasi wajib diisi'
        });
      }

      response = await fetch(VERIFY_BASE + 'verify', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, link }),
        signal: controller.signal
      });
    }

    // Endpoint tidak dikenal
    else {
      return res.status(404).json({
        ok: false,
        message: 'Endpoint tidak dikenal',
        available: [
          'GET /api/amprem?path=status',
          'POST /api/amprem?path=send',
          'POST /api/amprem?path=verify'
        ]
      });
    }

    const text = await response.text();

    res.setHeader(
      'Content-Type',
      response.headers.get('content-type') || 'application/json'
    );

    return res.status(response.status).send(text);

  } catch (error) {
    const reason =
      error && error.name === 'AbortError'
        ? 'timeout 20 detik'
        : (
            (error && error.cause &&
              (error.cause.code || error.cause.message)) ||
            (error && error.message) ||
            'unknown'
          );

    return res.status(502).json({
      ok: false,
      message: 'Gagal menghubungi API AM Premium (' + reason + ')'
    });

  } finally {
    clearTimeout(timer);
  }
};
