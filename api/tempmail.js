export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const { action, token, email } = req.query;
  const APIKEY = 'zelapi-4e3c73fc46bb468d';
  const BASE = 'https://zelapi.eu.cc/tempmail';
  
  try {
    let url = '';
    if (action === 'create' || action === 'generate') {
      url = `${BASE}/generate?apikey=${APIKEY}`;
    } else if (action === 'inbox' && token && email) {
      url = `${BASE}/inbox?apikey=${APIKEY}&email=${encodeURIComponent(email)}&token=${token}`;
    } else {
      return res.status(400).json({ error: 'Invalid action or missing params' });
    }
    
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
