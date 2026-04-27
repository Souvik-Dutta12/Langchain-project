import type { Context, Next } from 'hono'
import { UserModel } from '../models/user.js'
import type { AppVariables } from '../types/hono.js' 
import { createClerkClient } from '@clerk/backend'
import { env } from '../config/env.js'

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY })

export async function syncUserMiddleware(c: Context<{ Variables: AppVariables }>, next: Next) {
    const userId = c.get('userId')
    const user = await clerk.users.getUser(userId)

    const email =user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress || "";


    await UserModel.findOneAndUpdate(
      { clerkUserId: userId },
      {
        $set:{ 
          email, 
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