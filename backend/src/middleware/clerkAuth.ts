import { verifyToken } from '@clerk/backend'
import type { Context, Next } from 'hono'
import { env } from '../config/env.js'

export async function clerkAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  const tokenFromQuery = c.req.query('token')

  const token = authHeader?.replace('Bearer ', '') ?? tokenFromQuery

  if (!token) {
    console.error('No token provided')
    return c.json({ error: 'Unauthorized — no token provided' }, 401)
  }

  try {
    // console.log('Verifying token, secret key exists:', !!env.CLERK_SECRET_KEY)
    // Verify the JWT using Clerk's verifyToken
    const decoded = await verifyToken(token, { 
      secretKey: env.CLERK_SECRET_KEY,
      authorizedParties: [
        'http://localhost:3000', 
        'http://localhost:5173',
        'https://omnis.clerk.accounts.dev',
      ],
      clockSkewInMs: 60000,
    })
    
    // console.log('Token verified successfully, userId:', decoded.sub)
    c.set('userId', decoded.sub) 
    c.set('clerkPayload', decoded)

    await next()
  } catch (err: any) {
    console.error('Token verification failed:', JSON.stringify(err, null, 2))
    console.error('Token preview:', token?.substring(0, 50))
    return c.json({ error: 'Unauthorized', details: err.message }, 401)
  }
}