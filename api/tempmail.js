export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const { action, token } = req.query;
  
  try {
    if (action === 'gen') {
      const r = await fetch('https://api.tempmail.lol/generate');
      const data = await r.json();
      res.json({ email: data.address, token: data.token });
    } else if (action === 'inbox' && token) {
      const r = await fetch('https://api.tempmail.lol/auth/' + token);
      const data = await r.json();
      res.json(data.email || []);
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
