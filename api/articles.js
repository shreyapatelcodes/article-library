import { Redis } from '@upstash/redis'
import { getUserId } from '../lib/auth.js'

const redis = Redis.fromEnv()

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const articles = await redis.get(`articles:${userId}`) ?? []
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json(Array.isArray(articles) ? articles : [])
}
