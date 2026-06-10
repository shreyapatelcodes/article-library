import { Redis } from '@upstash/redis'
import { getUserId } from '../lib/auth.js'

const redis = Redis.fromEnv()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { articles } = req.body ?? {}
  if (!Array.isArray(articles)) return res.status(400).json({ error: 'articles array required' })

  await redis.set(`articles:${userId}`, articles)
  return res.status(200).json({ ok: true })
}
