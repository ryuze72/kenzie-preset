export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN missing' });

  const { password, presets } = req.body || {};
  if (password !== 'kenzie') return res.status(401).json({ error: 'Unauthorized' });
  if (!Array.isArray(presets)) return res.status(400).json({ error: 'presets must be array' });

  const owner = 'ryuze72';
  const repo = 'kenzie-preset';
  const path = 'presets.json';

  try {
    // Get current SHA
    const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
    });
    const getData = await getRes.json();
    const sha = getData.sha;

    const content = Buffer.from(JSON.stringify(presets, null, 2)).toString('base64');
    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Auto-update presets.json from admin',
        content,
        sha,
        branch: 'main'
      })
    });
    const putData = await putRes.json();
    if (!putRes.ok) return res.status(500).json({ error: putData.message || 'GitHub error' });
    return res.status(200).json({ ok: true, sha: putData.content?.sha });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
