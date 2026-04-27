import { createClerkClient, verifyToken } from '@clerk/backend'
import type { Context, Next } from 'hono'
import { env } from '../config/env.js'

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY })

export async function clerkAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  // Also check query param for SSE endpoints (EventSource can't set headers)
  const tokenFromQuery = c.req.query('token')

  const token = authHeader?.replace('Bearer ', '') ?? tokenFromQuery


  if (!token) {
    return c.json({ error: 'Unauthorized — no token provided' }, 401)
  }

  try {
    // Verify the JWT using Clerk's backend SDK
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY })

    // Attach userId to context for use in route handlers
    c.set('userId', payload.sub) 
    c.set('clerkPayload', payload)

    await next()
  } catch (err) {
    return c.json({ error: 'Unauthorized — invalid token' }, 401)
  }
}