export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const { action, email } = req.query;
  const APIKEY = '_mvCAp4042xedZVW';
  const BASE = 'https://api.jerexd.my.id/api/tools/tempmail';
  
  try {
    let url = `${BASE}?apikey=${APIKEY}&action=${action || 'create'}`;
    if (action === 'inbox' && email) url += `&email=${encodeURIComponent(email)}`;
    
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
