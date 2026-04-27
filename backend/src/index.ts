import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { clerkAuthMiddleware } from './middleware/clerkAuth.js';
import { env } from "./config/env.js";
import type { AppVariables } from './types/hono.js';
import { connectToDatabase } from './db/connection.js';
import { syncUserMiddleware } from './middleware/syncUser.js';

const app = new Hono<{ Variables: AppVariables }>();
app.use('*', cors({
  origin: "*",
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

//routes
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// protected routes
app.get('/api/debug-auth', clerkAuthMiddleware,syncUserMiddleware, (c) => {
  const userId = c.get('userId');

  console.log("DEBUG ROUTE HIT:", userId);

  return c.json({
    message: "Auth working",
    userId,
  });
});

connectToDatabase().then(() => {
  serve({
    fetch: app.fetch,
    port: Number(env.PORT)
  },
    () => { console.log(`Server running on http://localhost:${env.PORT}`) })
}).catch((error) => {
  console.error('Failed to connect to database. Server not started.', error);
})