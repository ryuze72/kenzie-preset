export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, presets } = req.body || {};
  if (password !== 'kenzie') return res.status(401).json({ error: 'Unauthorized' });
  if (!Array.isArray(presets)) return res.status(400).json({ error: 'presets must be array' });

  const BIN_ID = 'pcexosfWnXmzw6wk5NmgDQ';
  const TOKEN = 'js_edit_T9y2iIeZPa_K6jY3zFHZy9Vx9JwnWuDiFNndT-IYWG0';

  try {
    const r = await fetch(`https://api.jstash.app/v1/bins/${BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + TOKEN
      },
      body: JSON.stringify(presets)
    });
    const text = await r.text();
    if (!r.ok) return res.status(500).json({ error: 'jstash ' + r.status + ': ' + text.slice(0, 200) });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
