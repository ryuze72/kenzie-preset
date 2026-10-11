export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const { action, login, domain, id } = req.query;
  let url = '';
  
  if (action === 'gen') {
    url = 'https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1';
  } else if (action === 'inbox' && login && domain) {
    url = `https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`;
  } else if (action === 'read' && login && domain && id) {
    url = `https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${id}`;
  } else {
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  try {
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
