import type { Context, Next } from 'hono'
import { User } from '../models/user.js'
import type { AppVariables } from '../types/hono.js' 

export async function syncUserMiddleware(c: Context<{ Variables: AppVariables }>, next: Next) {
    const userId = c.get('userId')
    const payload = c.get('clerkPayload')
  
    await User.findOneAndUpdate(
      { clerkUserId: userId },
      {
        $set:{ 
          email: payload.email ?? '', 
          lastSeen: new Date() 
        },
        $setOnInsert: { 
          clerkUserId: userId, 
          isActive: true 
        },
      },
      { upsert: true }
    )
  
    await next()
  }