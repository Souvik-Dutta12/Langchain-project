// src/config/env.ts
import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config(
    {
        path: './.env'
    }
)
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),

  // Clerk
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),

  // Google Gemini
//   GOOGLE_API_KEY:         z.string().min(1),

//   // Pinecone
//   PINECONE_API_KEY:       z.string().min(1),
//   PINECONE_INDEX_NAME:    z.string().default('ebook-mafia'),
//   PINECONE_CLOUD:         z.string().default('aws'),
//   PINECONE_REGION:        z.string().default('us-east-1'),

//   // MongoDB
//   MONGODB_URL:            z.string().url(),

//   // Redis
//   REDIS_URL:              z.string().url(),

//   // AWS S3
//   AWS_BUCKET_NAME:        z.string().min(1),
//   AWS_ACCESS_KEY_ID:      z.string().min(1),
//   AWS_SECRET_ACCESS_KEY:  z.string().min(1),
//   AWS_REGION:             z.string().default('ap-south-1'),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>