// src/config/env.ts
import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3001'),

    // Clerk
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_PUBLISHABLE_KEY: z.string().min(1),

    // Google Gemini
    GOOGLE_API_KEY: z.string().min(1),

    // Hugging face
    HUGGINGFACE_API_KEY: z.string().min(1),

    // Pinecone
    PINECONE_API_KEY: z.string().min(1),
    PINECONE_INDEX_NAME: z.string().default('omnis'),
    PINECONE_CLOUD: z.string().default('aws'),
    PINECONE_REGION: z.string().default('us-east-1'),

    // MongoDB
    MONGODB_URL: z.string().url(),

    // Redis
    REDIS_URL: z.string().url(),

    // Cloudflare R2 (S3-compatible, free 10GB)
    CLOUDFLARE_ACCOUNT_ID:  z.string().min(1),
    R2_ACCESS_KEY_ID:       z.string().min(1),
    R2_SECRET_ACCESS_KEY:   z.string().min(1),
    R2_BUCKET_NAME:         z.string().min(1),
    R2_PUBLIC_URL:          z.string().url(),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>