export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { articles } = req.body ?? {};
  if (!Array.isArray(articles)) return res.status(400).json({ error: 'articles array required' });

  const repo  = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) return res.status(500).json({ error: 'GitHub not configured' });

  const apiUrl = `https://api.github.com/repos/${repo}/contents/data.json`;
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  try {
    const current = await fetch(apiUrl, { headers }).then(r => r.json());
    await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: 'Sync library state',
        content: Buffer.from(JSON.stringify({ articles }, null, 2)).toString('base64'),
        sha: current.sha,
      }),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Sync error:', err.message);
    return res.status(500).json({ error: 'Sync failed' });
  }
}
