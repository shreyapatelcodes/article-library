import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const raw = readFileSync(join(process.cwd(), 'data.json'), 'utf-8');
    const { articles } = JSON.parse(raw);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(articles || []);
  } catch (err) {
    console.error('data.json read error:', err.message);
    return res.status(200).json([]);
  }
}
