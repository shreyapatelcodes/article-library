import { verifyToken } from '@clerk/backend'

export async function getUserId(req) {
  const token = req.headers.authorization?.slice(7)
  if (!token) return null
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
    return payload.sub
  } catch {
    return null
  }
}
