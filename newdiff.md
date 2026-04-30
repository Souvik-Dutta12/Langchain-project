# Ebook Mafia — Complete File Tree + All Code
> npm · Cloudflare R2 (free 10GB) · BullMQ · LangChain.js · Gemini · Clerk · Hono · Pinecone

---

## Why Cloudflare R2 (not AWS S3)?

| Provider | Free Storage | Egress Cost | S3-Compatible |
|---|---|---|---|
| **Cloudflare R2** | **10 GB/month** | **Free (!)** | ✅ Same `@aws-sdk` |
| AWS S3 | 5 GB (12 months only) | Paid | ✅ |
| Backblaze B2 | 10 GB | Free up to 3× storage | ✅ |

**R2 wins**: Zero egress fees, 10GB free forever, works with the exact same `@aws-sdk/client-s3` package — you only change the endpoint URL. Minimal code changes from the original plan.

**Get R2 credentials**: Cloudflare Dashboard → R2 → Create Bucket → Manage R2 API Tokens

---

## Full File Tree

```
ebook-mafia/
├── package.json                          ← npm workspaces root
├── .env.example
├── .gitignore
├── docker-compose.yml
│
├── packages/
│   └── types/
│       ├── package.json
│       └── src/
│           ├── api.ts
│           └── index.ts
│
└── apps/
    ├── backend/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── Dockerfile
    │   └── src/
    │       ├── index.ts
    │       ├── config/
    │       │   ├── env.ts
    │       │   ├── db.ts
    │       │   ├── redis.ts
    │       │   └── pinecone.ts
    │       ├── middleware/
    │       │   ├── clerkAuth.ts
    │       │   └── syncUser.ts
    │       ├── models/
    │       │   ├── user.ts
    │       │   ├── book.ts
    │       │   ├── conversation.ts
    │       │   └── message.ts
    │       ├── routers/
    │       │   ├── books.ts
    │       │   ├── chat.ts
    │       │   ├── reports.ts
    │       │   └── quiz.ts
    │       ├── services/
    │       │   ├── pdfIngestion.ts
    │       │   ├── chunker.ts
    │       │   ├── embedder.ts
    │       │   ├── qaService.ts
    │       │   ├── reportService.ts
    │       │   ├── quizService.ts
    │       │   └── cache.ts
    │       ├── workers/
    │       │   └── pdfWorker.ts
    │       └── types/
    │           └── hono.ts
    │
    └── frontend/
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts
        ├── index.html
        └── src/
            ├── main.tsx
            ├── App.tsx
            ├── api/
            │   └── client.ts
            ├── hooks/
            │   ├── useChat.ts
            │   └── useBooks.ts
            ├── store/
            │   ├── useBooksStore.ts
            │   └── useChatStore.ts
            ├── components/
            │   ├── ProtectedRoute.tsx
            │   ├── FileUploader.tsx
            │   ├── ChatPanel.tsx
            │   └── PDFViewer.tsx
            ├── pages/
            │   ├── Landing.tsx
            │   ├── Dashboard.tsx
            │   └── books/
            │       ├── BookChat.tsx
            │       ├── ReportBuilder.tsx
            │       ├── QuizView.tsx
            │       └── Summary.tsx
            └── types/
                └── clerk.d.ts
```

---

## Flow Overview

```
USER uploads PDF
  → Frontend (react-dropzone) → POST /api/books/upload
  → Backend validates + uploads to Cloudflare R2
  → Creates MongoDB book doc (status: "pending")
  → Enqueues BullMQ job
  → Returns { bookId, status: "processing" }
  → Frontend polls GET /api/books/:id/status every 3s

BullMQ Worker picks up job:
  1. Downloads PDF Buffer from R2
  2. Extracts text per-page (pdf-parse)
  3. Chunks text (LangChain RecursiveCharacterTextSplitter)
  4. Embeds chunks (Gemini text-embedding-004)
  5. Upserts to Pinecone namespace: user_<clerkId>_book_<mongoId>
  6. Updates MongoDB status → "ready"

USER asks a question:
  → GET /api/chat/stream?query=...&bookId=...&token=<clerk_jwt>
  → Clerk JWT verified (query param for SSE)
  → Pinecone similarity search → top 6 chunks
  → Gemini 1.5 Pro generates answer with [Page N] citations
  → SSE streams tokens to frontend in real-time
  → Sources sent at end → user clicks page → PDF jumps to it
```

---

## ROOT FILES

### `package.json` (npm workspaces root)

```json
{
  "name": "ebook-mafia",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:backend": "npm run dev --workspace=apps/backend",
    "dev:frontend": "npm run dev --workspace=apps/frontend",
    "dev:worker": "npm run dev:worker --workspace=apps/backend",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "build": "npm run build --workspaces",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "docker:up": "docker compose up -d"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

### `.env.example`

```env
# ─── Clerk ──────────────────────────────────────────────
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxx

# ─── Google Gemini ──────────────────────────────────────
GOOGLE_API_KEY=AIzaSy_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ─── Pinecone ────────────────────────────────────────────
PINECONE_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PINECONE_INDEX_NAME=ebook-mafia

# ─── MongoDB ─────────────────────────────────────────────
MONGODB_URL=mongodb://localhost:27017/ebookmafia

# ─── Redis ───────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── Cloudflare R2 (FREE 10GB, no egress fees) ───────────
# Get from: Cloudflare Dashboard → R2 → Manage R2 API Tokens
CLOUDFLARE_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET_NAME=ebook-mafia-pdfs
# After creating bucket: Settings → Public URL or custom domain
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev

# ─── Frontend ─────────────────────────────────────────────
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxx
VITE_API_BASE_URL=http://localhost:3001/api
```

### `.gitignore`

```
node_modules/
dist/
.env
*.local
.DS_Store
```

### `docker-compose.yml`

```yaml
version: "3.9"

services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: ebookmafia

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongo_data:
  redis_data:

# Cloudflare R2, Pinecone, and Clerk are external services — no containers needed
```

---

## PACKAGES/TYPES

### `packages/types/package.json`

```json
{
  "name": "@ebook-mafia/types",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

### `packages/types/src/api.ts`

```typescript
export interface Book {
  id: string
  title: string
  author: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  processingProgress: number   // 0–100
  pageCount: number
  fileSize: number
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: Source[]
  createdAt: string
}

export interface Source {
  page: number
  chunk: string
  bookId: string
}

export interface QuizQuestion {
  question: string
  options: [string, string, string, string]
  correctIndex: number
  page: number
  explanation: string
}

export interface UploadResponse {
  bookId: string
  status: 'processing'
  message: string
}

export interface ChatResponse {
  answer: string
  sources: Source[]
}

export interface ReportResponse {
  markdown: string
  sources: Array<{ page: number; chunk: string }>
}
```

### `packages/types/src/index.ts`

```typescript
export * from './api'
```

---

## APPS/BACKEND

### `apps/backend/package.json`

```json
{
  "name": "@ebook-mafia/backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "dev:worker": "tsx watch src/workers/pdfWorker.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "start:worker": "node dist/workers/pdfWorker.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.600.0",
    "@aws-sdk/lib-storage": "^3.600.0",
    "@clerk/backend": "^1.3.0",
    "@ebook-mafia/types": "*",
    "@hono/node-server": "^1.12.0",
    "@langchain/google-genai": "^0.0.23",
    "@langchain/pinecone": "^0.1.0",
    "@pinecone-database/pinecone": "^3.0.0",
    "bullmq": "^5.8.0",
    "docx": "^8.5.0",
    "dotenv": "^16.4.5",
    "hono": "^4.4.5",
    "hono-rate-limiter": "^0.4.0",
    "ioredis": "^5.4.1",
    "langchain": "^0.2.10",
    "mongoose": "^8.5.0",
    "pdf-parse": "^1.1.1",
    "pdfjs-dist": "^4.4.168",
    "pdfkit": "^0.15.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^20.14.10",
    "@types/pdf-parse": "^1.1.4",
    "@types/pdfkit": "^0.13.9",
    "tsx": "^4.16.2",
    "typescript": "^5.5.3"
  }
}
```

### `apps/backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### `apps/backend/src/config/env.ts`

```typescript
import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  NODE_ENV:               z.enum(['development', 'production', 'test']).default('development'),
  PORT:                   z.string().default('3001'),

  // Clerk
  CLERK_SECRET_KEY:       z.string().min(1),
  CLERK_PUBLISHABLE_KEY:  z.string().min(1),

  // Google Gemini
  GOOGLE_API_KEY:         z.string().min(1),

  // Pinecone
  PINECONE_API_KEY:       z.string().min(1),
  PINECONE_INDEX_NAME:    z.string().default('ebook-mafia'),

  // MongoDB
  MONGODB_URL:            z.string().url(),

  // Redis
  REDIS_URL:              z.string().url(),

  // Cloudflare R2 (S3-compatible, free 10GB)
  CLOUDFLARE_ACCOUNT_ID:  z.string().min(1),
  R2_ACCESS_KEY_ID:       z.string().min(1),
  R2_SECRET_ACCESS_KEY:   z.string().min(1),
  R2_BUCKET_NAME:         z.string().min(1),
  R2_PUBLIC_URL:          z.string().url(),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>
```

### `apps/backend/src/config/db.ts`

```typescript
import mongoose from 'mongoose'
import { env } from './env'

let isConnected = false

export async function connectDB(): Promise<void> {
  if (isConnected) return

  try {
    await mongoose.connect(env.MONGODB_URL)
    isConnected = true
    console.log('✅ MongoDB connected')
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err)
    process.exit(1)
  }
}
```

### `apps/backend/src/config/redis.ts`

```typescript
import { Redis } from 'ioredis'
import { env } from './env'

// Singleton Redis client for caching
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,   // required by BullMQ
  enableReadyCheck: false,
})

redis.on('connect', () => console.log('✅ Redis connected'))
redis.on('error', (err) => console.error('❌ Redis error:', err))
```

### `apps/backend/src/config/pinecone.ts`

```typescript
import { Pinecone } from '@pinecone-database/pinecone'
import { env } from './env'

export const pinecone = new Pinecone({ apiKey: env.PINECONE_API_KEY })

// Call this once at startup to ensure index exists
export async function ensurePineconeIndex(): Promise<void> {
  const indexes = await pinecone.listIndexes()
  const exists = indexes.indexes?.some((i) => i.name === env.PINECONE_INDEX_NAME)

  if (!exists) {
    await pinecone.createIndex({
      name: env.PINECONE_INDEX_NAME,
      dimension: 768,              // Gemini text-embedding-004 = 768 dimensions
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    })
    console.log(`✅ Pinecone index "${env.PINECONE_INDEX_NAME}" created`)
  } else {
    console.log(`✅ Pinecone index "${env.PINECONE_INDEX_NAME}" ready`)
  }
}
```

### `apps/backend/src/types/hono.ts`

```typescript
export type AppVariables = {
  userId: string
  clerkEmail: string
}
```

### `apps/backend/src/middleware/clerkAuth.ts`

```typescript
import { createClerkClient } from '@clerk/backend'
import type { Context, Next } from 'hono'
import { env } from '../config/env'
import type { AppVariables } from '../types/hono'

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY })

export async function clerkAuthMiddleware(
  c: Context<{ Variables: AppVariables }>,
  next: Next
) {
  const authHeader = c.req.header('Authorization')
  // SSE (EventSource) can't set headers — accept token from query param too
  const tokenFromQuery = c.req.query('token')
  const token = authHeader?.replace('Bearer ', '') ?? tokenFromQuery

  if (!token) {
    return c.json({ error: 'Unauthorized — no token provided' }, 401)
  }

  try {
    const payload = await clerk.verifyToken(token)
    c.set('userId', payload.sub)

    // Extract email from payload if available
    const email = (payload as any).email ?? ''
    c.set('clerkEmail', email)

    await next()
  } catch {
    return c.json({ error: 'Unauthorized — invalid token' }, 401)
  }
}
```

### `apps/backend/src/middleware/syncUser.ts`

```typescript
import type { Context, Next } from 'hono'
import { UserModel } from '../models/user'
import type { AppVariables } from '../types/hono'

// Runs after clerkAuthMiddleware — upserts user in MongoDB on first login
export async function syncUserMiddleware(
  c: Context<{ Variables: AppVariables }>,
  next: Next
) {
  const userId = c.get('userId')
  const email  = c.get('clerkEmail')

  await UserModel.findOneAndUpdate(
    { clerkUserId: userId },
    {
      $set:         { email, lastSeen: new Date() },
      $setOnInsert: { clerkUserId: userId, isActive: true },
    },
    { upsert: true, new: true }
  )

  await next()
}
```

### `apps/backend/src/models/user.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  clerkUserId: string   // Clerk's user ID — primary identifier (no passwords!)
  email: string
  isActive: boolean
  lastSeen: Date
  createdAt: Date
}

const UserSchema = new Schema<IUser>({
  clerkUserId: { type: String, required: true, unique: true, index: true },
  email:       { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  lastSeen:    { type: Date, default: Date.now },
}, { timestamps: true })

export const UserModel = mongoose.model<IUser>('User', UserSchema)
```

### `apps/backend/src/models/book.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose'

export interface IBook extends Document {
  title: string
  author: string
  ownerClerkId: string
  r2Key: string                  // was s3Key — same concept, Cloudflare R2
  r2Url: string                  // public URL for serving the PDF
  fileSize: number
  pageCount: number
  status: 'pending' | 'processing' | 'ready' | 'failed'
  processingProgress: number
  pineconeNamespace: string      // user_<clerkId>_book_<mongoId>
  createdAt: Date
  updatedAt: Date
}

const BookSchema = new Schema<IBook>({
  title:               { type: String, required: true },
  author:              { type: String, default: '' },
  ownerClerkId:        { type: String, required: true, index: true },
  r2Key:               { type: String, default: '' },
  r2Url:               { type: String, default: '' },
  fileSize:            { type: Number, default: 0 },
  pageCount:           { type: Number, default: 0 },
  status:              {
    type: String,
    enum: ['pending', 'processing', 'ready', 'failed'],
    default: 'pending',
  },
  processingProgress:  { type: Number, default: 0, min: 0, max: 100 },
  pineconeNamespace:   { type: String, default: '' },
}, { timestamps: true })

export const BookModel = mongoose.model<IBook>('Book', BookSchema)
```

### `apps/backend/src/models/conversation.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose'

export interface IConversation extends Document {
  ownerClerkId: string
  bookId: string
  title: string
  createdAt: Date
}

const ConversationSchema = new Schema<IConversation>({
  ownerClerkId: { type: String, required: true, index: true },
  bookId:       { type: String, required: true },
  title:        { type: String, default: 'New Conversation' },
}, { timestamps: true })

export const ConversationModel = mongoose.model<IConversation>('Conversation', ConversationSchema)
```

### `apps/backend/src/models/message.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose'

export interface IMessage extends Document {
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  sources: Array<{ page: number; chunk: string; bookId: string }>
  tokensUsed: number
  createdAt: Date
}

const MessageSchema = new Schema<IMessage>({
  conversationId: { type: String, required: true, index: true },
  role:           { type: String, enum: ['user', 'assistant'], required: true },
  content:        { type: String, required: true },
  sources:        { type: [{ page: Number, chunk: String, bookId: String }], default: [] },
  tokensUsed:     { type: Number, default: 0 },
}, { timestamps: true })

export const MessageModel = mongoose.model<IMessage>('Message', MessageSchema)
```

### `apps/backend/src/services/pdfIngestion.ts`

```typescript
import pdfParse from 'pdf-parse'

export interface PageData {
  page: number
  text: string
}

/**
 * Extracts text from a PDF buffer, organized by page number.
 * Uses pdf-parse's pagerender callback to capture each page separately.
 */
export async function extractTextWithPages(pdfBuffer: Buffer): Promise<PageData[]> {
  const pages: PageData[] = []

  await pdfParse(pdfBuffer, {
    pagerender: (pageData: any) => {
      return pageData.getTextContent().then((content: any) => {
        const text = content.items
          .map((item: any) => item.str)
          .join(' ')
          .trim()

        if (text.length > 20) { // skip nearly empty pages
          pages.push({ page: pageData.pageIndex + 1, text })
        }

        return text
      })
    },
  })

  return pages
}
```

### `apps/backend/src/services/chunker.ts`

```typescript
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { Document } from 'langchain/document'
import type { PageData } from './pdfIngestion'

/**
 * Splits page text into overlapping chunks that fit in Gemini's embedding window.
 * Each chunk keeps bookId + page number in metadata for citation.
 */
export function chunkPages(pages: PageData[], bookId: string): Document[] {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 150,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  })

  const allChunks: Document[] = []

  for (const page of pages) {
    // splitText is sync in recent LangChain versions — use createDocuments for async
    const texts = splitter.splitText(page.text)

    // splitText returns a Promise in some versions — handle both
    Promise.resolve(texts).then((chunks) => {
      chunks.forEach((chunk, idx) => {
        allChunks.push(
          new Document({
            pageContent: chunk,
            metadata: {
              bookId,
              page: page.page,
              chunkId: `${bookId}-p${page.page}-c${idx}`,
            },
          })
        )
      })
    })
  }

  return allChunks
}

// Async version for use in worker (preferred)
export async function chunkPagesAsync(pages: PageData[], bookId: string): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 150,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  })

  const allChunks: Document[] = []

  for (const page of pages) {
    const chunks = await splitter.splitText(page.text)
    chunks.forEach((chunk, idx) => {
      allChunks.push(
        new Document({
          pageContent: chunk,
          metadata: {
            bookId,
            page: page.page,
            chunkId: `${bookId}-p${page.page}-c${idx}`,
          },
        })
      )
    })
  }

  return allChunks
}
```

### `apps/backend/src/services/embedder.ts`

```typescript
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { PineconeStore } from '@langchain/pinecone'
import { Document } from 'langchain/document'
import { pinecone } from '../config/pinecone'
import { env } from '../config/env'

export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'text-embedding-004',   // 768 dimensions — free tier on Gemini API
  apiKey: env.GOOGLE_API_KEY,
})

/**
 * Embeds chunks with Gemini and upserts them into a Pinecone namespace.
 * Batches 100 at a time to avoid rate limits.
 */
export async function embedAndUpsert(
  chunks: Document[],
  namespace: string
): Promise<void> {
  const index = pinecone.index(env.PINECONE_INDEX_NAME)
  const batchSize = 100

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)

    await PineconeStore.fromDocuments(batch, embeddings, {
      pineconeIndex: index,
      namespace,
    })

    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(chunks.length / batchSize)
    console.log(`  📦 Embedded batch ${batchNum}/${totalBatches}`)

    // Small delay to respect Gemini embedding rate limits
    if (i + batchSize < chunks.length) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }
}

/**
 * Returns a PineconeStore connected to an existing namespace (for querying).
 */
export async function getVectorStore(namespace: string): Promise<PineconeStore> {
  const index = pinecone.index(env.PINECONE_INDEX_NAME)
  return PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    namespace,
  })
}
```

### `apps/backend/src/services/qaService.ts`

```typescript
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { createRetrievalChain } from 'langchain/chains/retrieval'
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { getVectorStore } from './embedder'
import { env } from '../config/env'

// Gemini 1.5 Pro with streaming for user-facing Q&A
const llmPro = new ChatGoogleGenerativeAI({
  model: 'gemini-1.5-pro',
  temperature: 0.2,
  apiKey: env.GOOGLE_API_KEY,
  streaming: true,
})

const RAG_PROMPT = ChatPromptTemplate.fromTemplate(`
You are an intelligent assistant helping a user understand an ebook.
Answer ONLY using the context provided below.
Always cite the page number(s) you derived your answer from, like [Page 34] or [Pages 34, 67].
If the information is not in the context, say exactly:
"This information is not available in the provided book content."

Context from the book:
{context}

User Question: {input}

Answer (with page citations):
`)

export async function buildQAChain(namespace: string) {
  const vectorStore = await getVectorStore(namespace)

  // MMR retrieval avoids returning repetitive chunks
  const retriever = vectorStore.asRetriever({
    searchType: 'mmr',
    k: 6,
  })

  const documentChain = await createStuffDocumentsChain({
    llm: llmPro,
    prompt: RAG_PROMPT,
    outputParser: new StringOutputParser(),
  })

  return createRetrievalChain({
    retriever,
    combineDocsChain: documentChain,
  })
}
```

### `apps/backend/src/services/reportService.ts`

```typescript
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { PromptTemplate } from '@langchain/core/prompts'
import { LLMChain } from 'langchain/chains'
import { getVectorStore } from './embedder'
import PDFDocument from 'pdfkit'
import { env } from '../config/env'

const REPORT_PROMPT = PromptTemplate.fromTemplate(`
You are a professional report writer. Based ONLY on the following book excerpts,
write a detailed, well-structured report on the topic: {topic}.

Structure your report exactly as:
# Introduction
[2-3 paragraphs introducing the topic as covered in this book]

# Key Concepts
[the most important ideas]

# Detailed Analysis
[in-depth discussion]

# Examples and Evidence
[specific examples from the text, always cite page numbers]

# Conclusion
[wrap-up and key takeaways]

# Sources Referenced
[list all pages cited throughout the report]

Book Excerpts:
{context}
`)

export async function generateReport(
  topic: string,
  namespace: string
): Promise<{ markdown: string; sources: Array<{ page: number; chunk: string }> }> {
  const vectorStore = await getVectorStore(namespace)

  // Fetch more chunks for a comprehensive report
  const retriever = vectorStore.asRetriever({ k: 12 })
  const docs = await retriever.getRelevantDocuments(topic)

  const context = docs
    .map((d) => `[Page ${d.metadata.page}]: ${d.pageContent}`)
    .join('\n\n')

  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-1.5-pro',
    temperature: 0.3,
    apiKey: env.GOOGLE_API_KEY,
  })

  const chain = new LLMChain({ llm, prompt: REPORT_PROMPT })
  const result = await chain.call({ topic, context })

  return {
    markdown: result.text as string,
    sources: docs.map((d) => ({
      page:  d.metadata.page as number,
      chunk: (d.pageContent as string).slice(0, 150),
    })),
  }
}

export async function exportReportAsPDF(markdown: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end',  () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const lines = markdown.split('\n')
    for (const line of lines) {
      if (line.startsWith('# ')) {
        doc.moveDown(0.5)
           .fontSize(18)
           .font('Helvetica-Bold')
           .text(line.slice(2), { paragraphGap: 6 })
      } else if (line.startsWith('## ')) {
        doc.moveDown(0.3)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text(line.slice(3), { paragraphGap: 4 })
      } else if (line.trim()) {
        doc.fontSize(11)
           .font('Helvetica')
           .text(line, { paragraphGap: 3, lineGap: 2 })
      }
    }

    doc.end()
  })
}
```

### `apps/backend/src/services/quizService.ts`

```typescript
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { PromptTemplate } from '@langchain/core/prompts'
import { LLMChain } from 'langchain/chains'
import { getVectorStore } from './embedder'
import { z } from 'zod'
import { env } from '../config/env'

const QuizSchema = z.array(
  z.object({
    question:     z.string(),
    options:      z.tuple([z.string(), z.string(), z.string(), z.string()]),
    correctIndex: z.number().int().min(0).max(3),
    page:         z.number().int(),
    explanation:  z.string(),
  })
)

const QUIZ_PROMPT = PromptTemplate.fromTemplate(`
Based on the following book content, generate {numQuestions} multiple-choice questions.

Rules:
- Each question must be clear and have exactly ONE correct answer
- All 4 options must be plausible (none should be obviously wrong)
- Include the page number the question is based on
- Include a brief explanation for the correct answer

Respond with ONLY a valid JSON array. No markdown. No preamble. No code fences.

Format:
[
  {{
    "question": "...",
    "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
    "correctIndex": 0,
    "page": 12,
    "explanation": "Because..."
  }}
]

Book Content:
{context}
`)

export async function generateQuiz(
  topic: string,
  namespace: string,
  numQuestions: number = 10
) {
  const vectorStore = await getVectorStore(namespace)
  const docs = await vectorStore.asRetriever({ k: 8 }).getRelevantDocuments(topic)
  const context = docs
    .map((d) => `[Page ${d.metadata.page}]: ${d.pageContent}`)
    .join('\n\n')

  // Use Flash model — much cheaper, fast enough for quiz generation
  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-1.5-flash',
    temperature: 0.4,
    apiKey: env.GOOGLE_API_KEY,
  })

  const chain = new LLMChain({ llm, prompt: QUIZ_PROMPT })
  const result = await chain.call({ context, numQuestions })

  // Strip accidental markdown fences before JSON.parse
  const cleaned = (result.text as string)
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim()

  const parsed = JSON.parse(cleaned)
  return QuizSchema.parse(parsed)  // Zod validates structure
}
```

### `apps/backend/src/services/cache.ts`

```typescript
import { redis } from '../config/redis'

/**
 * Generic Redis cache wrapper.
 * If the key exists, returns cached value. Otherwise runs fn() and caches result.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key)
  if (cached) {
    return JSON.parse(cached) as T
  }

  const result = await fn()
  await redis.setex(key, ttlSeconds, JSON.stringify(result))
  return result
}

export function buildCacheKey(...parts: string[]): string {
  return parts.join(':').replace(/\s+/g, '_').toLowerCase()
}
```

### `apps/backend/src/workers/pdfWorker.ts`

```typescript
/**
 * BullMQ Worker — PDF Ingestion Pipeline
 *
 * Run separately from the API server:
 *   npm run dev:worker --workspace=apps/backend
 *
 * Flow:
 *   1. Download PDF Buffer from Cloudflare R2
 *   2. Extract text per page (pdf-parse)
 *   3. Chunk text into LangChain Documents
 *   4. Embed with Gemini text-embedding-004
 *   5. Upsert into Pinecone namespace
 *   6. Update MongoDB book status → "ready"
 */
import 'dotenv/config'
import { Worker, Job } from 'bullmq'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { connectDB } from '../config/db'
import { ensurePineconeIndex } from '../config/pinecone'
import { extractTextWithPages } from '../services/pdfIngestion'
import { chunkPagesAsync } from '../services/chunker'
import { embedAndUpsert } from '../services/embedder'
import { BookModel } from '../models/book'
import { env } from '../config/env'

// Cloudflare R2 — same SDK as AWS S3, just different endpoint
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
})

interface IngestionJobData {
  bookId: string
  r2Key: string
  userId: string
  namespace: string
}

async function startWorker() {
  await connectDB()
  await ensurePineconeIndex()

  const worker = new Worker<IngestionJobData>(
    'pdf-ingestion',
    async (job: Job<IngestionJobData>) => {
      const { bookId, r2Key, userId, namespace } = job.data
      console.log(`📖 Starting ingestion for book ${bookId}`)

      // ── Step 1: Mark as processing ─────────────────────────────────
      await BookModel.updateOne(
        { _id: bookId },
        { status: 'processing', processingProgress: 5 }
      )

      // ── Step 2: Download PDF from R2 ───────────────────────────────
      const r2Response = await r2.send(
        new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: r2Key })
      )
      const pdfBuffer = Buffer.from(
        await r2Response.Body!.transformToByteArray()
      )
      console.log(`  ✅ Downloaded ${(pdfBuffer.length / 1024 / 1024).toFixed(1)}MB from R2`)
      await BookModel.updateOne({ _id: bookId }, { processingProgress: 20 })

      // ── Step 3: Extract text per page ──────────────────────────────
      const pages = await extractTextWithPages(pdfBuffer)
      console.log(`  ✅ Extracted text from ${pages.length} pages`)
      await BookModel.updateOne(
        { _id: bookId },
        { processingProgress: 40, pageCount: pages.length }
      )

      // ── Step 4: Chunk into LangChain Documents ─────────────────────
      const chunks = await chunkPagesAsync(pages, bookId)
      console.log(`  ✅ Created ${chunks.length} chunks`)
      await BookModel.updateOne({ _id: bookId }, { processingProgress: 60 })

      // ── Step 5: Embed + Upsert into Pinecone ───────────────────────
      await embedAndUpsert(chunks, namespace)
      console.log(`  ✅ Upserted ${chunks.length} vectors to Pinecone namespace "${namespace}"`)
      await BookModel.updateOne({ _id: bookId }, { processingProgress: 95 })

      // ── Step 6: Mark as ready ──────────────────────────────────────
      await BookModel.updateOne(
        { _id: bookId },
        { status: 'ready', processingProgress: 100 }
      )
      console.log(`✅ Book ${bookId} ready`)
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: 2,         // process 2 PDFs simultaneously
      limiter: {
        max: 8,               // max 8 Gemini embedding calls per...
        duration: 1000,       // ...1 second (respect rate limits)
      },
    }
  )

  worker.on('failed', async (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message)
    if (job) {
      await BookModel.updateOne(
        { _id: job.data.bookId },
        { status: 'failed' }
      )
    }
  })

  worker.on('completed', (job) => {
    console.log(`🎉 Job ${job.id} completed`)
  })

  console.log('🔧 PDF ingestion worker started')
}

startWorker().catch(console.error)
```

### `apps/backend/src/routers/books.ts`

```typescript
import { Hono } from 'hono'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { Queue } from 'bullmq'
import { BookModel } from '../models/book'
import { env } from '../config/env'
import type { AppVariables } from '../types/hono'
import { pinecone } from '../config/pinecone'

const router = new Hono<{ Variables: AppVariables }>()

// Cloudflare R2 client — S3-compatible
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
})

const ingestionQueue = new Queue('pdf-ingestion', {
  connection: { url: env.REDIS_URL },
})

// GET /api/books — list user's books
router.get('/', async (c) => {
  const userId = c.get('userId')
  const books = await BookModel.find({ ownerClerkId: userId })
    .sort({ createdAt: -1 })
    .lean()

  return c.json({ books })
})

// POST /api/books/upload — upload PDF → R2 → enqueue ingestion job
router.post('/upload', async (c) => {
  const userId = c.get('userId')
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return c.json({ error: 'No file provided' }, 400)
  }
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return c.json({ error: 'Only PDF files are accepted' }, 400)
  }
  if (file.size > 100 * 1024 * 1024) {
    return c.json({ error: 'File too large (max 100MB)' }, 413)
  }

  // Create book doc in MongoDB first to get its ID
  const book = await BookModel.create({
    title: file.name.replace(/\.pdf$/i, '').replace(/_/g, ' '),
    ownerClerkId: userId,
    fileSize: file.size,
    status: 'pending',
  })

  const r2Key = `pdfs/${userId}/${book.id}.pdf`
  const namespace = `user_${userId}_book_${book.id}`

  // Upload to Cloudflare R2
  const buffer = Buffer.from(await file.arrayBuffer())
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: r2Key,
      Body: buffer,
      ContentType: 'application/pdf',
    })
  )

  // Update book with R2 info
  book.r2Key = r2Key
  book.r2Url = `${env.R2_PUBLIC_URL}/${r2Key}`
  book.pineconeNamespace = namespace
  await book.save()

  // Enqueue BullMQ job (async — don't await, return immediately)
  await ingestionQueue.add(
    'ingest-pdf',
    { bookId: book.id, r2Key, userId, namespace },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
    }
  )

  return c.json(
    { bookId: book.id, status: 'processing', message: 'PDF is being processed' },
    202
  )
})

// GET /api/books/:id/status — poll processing status
router.get('/:id/status', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()

  const book = await BookModel.findOne({ _id: id, ownerClerkId: userId }).lean()
  if (!book) return c.json({ error: 'Book not found' }, 404)

  return c.json({
    status: book.status,
    processingProgress: book.processingProgress,
    pageCount: book.pageCount,
  })
})

// GET /api/books/:id — get single book
router.get('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()

  const book = await BookModel.findOne({ _id: id, ownerClerkId: userId }).lean()
  if (!book) return c.json({ error: 'Book not found' }, 404)

  return c.json({ book })
})

// DELETE /api/books/:id — delete book + R2 file + Pinecone namespace
router.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()

  const book = await BookModel.findOne({ _id: id, ownerClerkId: userId })
  if (!book) return c.json({ error: 'Book not found' }, 404)

  // Delete from R2
  if (book.r2Key) {
    await r2.send(
      new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: book.r2Key })
    )
  }

  // Delete from Pinecone namespace
  if (book.pineconeNamespace) {
    const index = pinecone.index(env.PINECONE_INDEX_NAME)
    await index.namespace(book.pineconeNamespace).deleteAll()
  }

  await book.deleteOne()

  return c.json({ success: true })
})

export default router
```

### `apps/backend/src/routers/chat.ts`

```typescript
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { buildQAChain } from '../services/qaService'
import { BookModel } from '../models/book'
import { MessageModel } from '../models/message'
import type { AppVariables } from '../types/hono'

const router = new Hono<{ Variables: AppVariables }>()

/**
 * GET /api/chat/stream?query=...&bookId=...&token=<clerk_jwt>
 *
 * SSE streaming endpoint. Token is accepted as query param because
 * EventSource (SSE) cannot set Authorization headers.
 *
 * Emits:
 *   event: token  — each LLM token
 *   event: sources — JSON array of source citations
 *   event: done   — stream complete
 */
router.get('/stream', async (c) => {
  const userId = c.get('userId')
  const query  = c.req.query('query')
  const bookId = c.req.query('bookId')

  if (!query || !bookId) {
    return c.json({ error: 'Missing query or bookId' }, 400)
  }
  if (query.length > 2000) {
    return c.json({ error: 'Query too long (max 2000 chars)' }, 400)
  }

  const book = await BookModel.findOne({
    _id: bookId,
    ownerClerkId: userId,
    status: 'ready',
  })
  if (!book) {
    return c.json({ error: 'Book not found or not ready' }, 404)
  }

  return streamSSE(c, async (stream) => {
    let fullAnswer = ''
    let sourceDocuments: any[] = []

    try {
      const chain = await buildQAChain(book.pineconeNamespace)
      const result = await chain.stream({ input: query })

      for await (const chunk of result) {
        if (chunk.answer) {
          fullAnswer += chunk.answer
          await stream.writeSSE({ data: chunk.answer, event: 'token' })
        }
        if (chunk.context) {
          sourceDocuments = chunk.context
        }
      }

      const sources = sourceDocuments.map((doc: any) => ({
        page:   doc.metadata?.page ?? 0,
        chunk:  (doc.pageContent as string).slice(0, 200),
        bookId: doc.metadata?.bookId ?? bookId,
      }))

      await stream.writeSSE({ data: JSON.stringify(sources), event: 'sources' })
      await stream.writeSSE({ data: 'done', event: 'done' })

      // Persist to MongoDB (fire and forget)
      MessageModel.create([
        { conversationId: bookId, role: 'user',      content: query,       sources: [] },
        { conversationId: bookId, role: 'assistant', content: fullAnswer,  sources },
      ]).catch(console.error)

    } catch (err) {
      console.error('Chat stream error:', err)
      await stream.writeSSE({ data: 'An error occurred', event: 'error' })
    }
  })
})

// GET /api/chat/history/:bookId — fetch past messages
router.get('/history/:bookId', async (c) => {
  const userId = c.get('userId')
  const { bookId } = c.req.param()

  // Verify book ownership
  const book = await BookModel.findOne({ _id: bookId, ownerClerkId: userId })
  if (!book) return c.json({ error: 'Book not found' }, 404)

  const messages = await MessageModel.find({ conversationId: bookId })
    .sort({ createdAt: 1 })
    .limit(100)
    .lean()

  return c.json({ messages })
})

export default router
```

### `apps/backend/src/routers/reports.ts`

```typescript
import { Hono } from 'hono'
import { generateReport, exportReportAsPDF } from '../services/reportService'
import { withCache, buildCacheKey } from '../services/cache'
import { BookModel } from '../models/book'
import type { AppVariables } from '../types/hono'

const router = new Hono<{ Variables: AppVariables }>()

// POST /api/reports/generate
router.post('/generate', async (c) => {
  const userId = c.get('userId')
  const { bookId, topic } = await c.req.json<{ bookId: string; topic: string }>()

  if (!bookId || !topic) {
    return c.json({ error: 'bookId and topic are required' }, 400)
  }

  const book = await BookModel.findOne({ _id: bookId, ownerClerkId: userId, status: 'ready' })
  if (!book) return c.json({ error: 'Book not found or not ready' }, 404)

  // Cache reports for 1 hour (reports are expensive — Gemini Pro + 12 chunks)
  const cacheKey = buildCacheKey('report', book.pineconeNamespace, topic)
  const report = await withCache(cacheKey, 3600, () =>
    generateReport(topic, book.pineconeNamespace)
  )

  return c.json(report)
})

// POST /api/reports/export-pdf — returns PDF binary
router.post('/export-pdf', async (c) => {
  const { markdown } = await c.req.json<{ markdown: string }>()
  if (!markdown) return c.json({ error: 'markdown is required' }, 400)

  const pdfBuffer = await exportReportAsPDF(markdown)

  return new Response(pdfBuffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': 'attachment; filename="report.pdf"',
    },
  })
})

export default router
```

### `apps/backend/src/routers/quiz.ts`

```typescript
import { Hono } from 'hono'
import { generateQuiz } from '../services/quizService'
import { withCache, buildCacheKey } from '../services/cache'
import { BookModel } from '../models/book'
import type { AppVariables } from '../types/hono'

const router = new Hono<{ Variables: AppVariables }>()

// POST /api/quiz/generate
router.post('/generate', async (c) => {
  const userId = c.get('userId')
  const { bookId, topic, numQuestions = 10 } =
    await c.req.json<{ bookId: string; topic: string; numQuestions?: number }>()

  if (!bookId || !topic) {
    return c.json({ error: 'bookId and topic are required' }, 400)
  }

  const book = await BookModel.findOne({ _id: bookId, ownerClerkId: userId, status: 'ready' })
  if (!book) return c.json({ error: 'Book not found or not ready' }, 404)

  const cacheKey = buildCacheKey('quiz', book.pineconeNamespace, topic, String(numQuestions))
  const questions = await withCache(cacheKey, 3600, () =>
    generateQuiz(topic, book.pineconeNamespace, numQuestions)
  )

  return c.json({ questions })
})

export default router
```

### `apps/backend/src/index.ts`

```typescript
import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { rateLimiter } from 'hono-rate-limiter'
import { connectDB } from './config/db'
import { ensurePineconeIndex } from './config/pinecone'
import { clerkAuthMiddleware } from './middleware/clerkAuth'
import { syncUserMiddleware } from './middleware/syncUser'
import booksRouter from './routers/books'
import chatRouter from './routers/chat'
import reportsRouter from './routers/reports'
import quizRouter from './routers/quiz'
import type { AppVariables } from './types/hono'
import { env } from './config/env'

const app = new Hono<{ Variables: AppVariables }>()

// ── CORS ────────────────────────────────────────────────────────────
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://your-app.vercel.app'],
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

// ── Public routes ────────────────────────────────────────────────────
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ── Auth middleware (all /api/* routes) ──────────────────────────────
app.use('/api/*', clerkAuthMiddleware)
app.use('/api/*', syncUserMiddleware)

// ── Rate limiting ────────────────────────────────────────────────────
// Chat: 20 requests/minute per user
app.use('/api/chat/*', rateLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (c) => c.get('userId'),
}))

// Reports & Quiz: 5 requests/minute (LLM-heavy)
app.use('/api/reports/*', rateLimiter({
  windowMs: 60 * 1000,
  limit: 5,
  keyGenerator: (c) => c.get('userId'),
}))

// ── Routes ───────────────────────────────────────────────────────────
app.route('/api/books',   booksRouter)
app.route('/api/chat',    chatRouter)
app.route('/api/reports', reportsRouter)
app.route('/api/quiz',    quizRouter)

// ── 404 handler ──────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Route not found' }, 404))

// ── Error handler ─────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

// ── Startup ───────────────────────────────────────────────────────────
async function main() {
  await connectDB()
  await ensurePineconeIndex()

  serve({ fetch: app.fetch, port: Number(env.PORT) }, () => {
    console.log(`🚀 Backend running on http://localhost:${env.PORT}`)
  })
}

main().catch(console.error)
```

### `apps/backend/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/types/package*.json ./packages/types/
RUN npm install
COPY . .
RUN npm run build --workspace=apps/backend

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package*.json ./
RUN npm install --omit=dev
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

---

## APPS/FRONTEND

### `apps/frontend/package.json`

```json
{
  "name": "@ebook-mafia/frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@clerk/clerk-react": "^5.2.0",
    "@ebook-mafia/types": "*",
    "@hookform/resolvers": "^3.9.0",
    "axios": "^1.7.2",
    "lucide-react": "^0.408.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-dropzone": "^14.2.3",
    "react-hook-form": "^7.52.1",
    "react-pdf": "^9.1.0",
    "react-router-dom": "^6.24.1",
    "zustand": "^4.5.4",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/node": "^20.14.10",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.5.3",
    "vite": "^5.3.3"
  }
}
```

### `apps/frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### `apps/frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
```

### `apps/frontend/src/types/clerk.d.ts`

```typescript
interface Window {
  Clerk?: {
    session?: {
      getToken: (options?: { template?: string }) => Promise<string | null>
    }
    redirectToSignIn: () => void
  }
}
```

### `apps/frontend/src/api/client.ts`

```typescript
import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

// Attach Clerk JWT to every request
apiClient.interceptors.request.use(async (config) => {
  const token = await window.Clerk?.session?.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally — redirect to Clerk sign-in
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.Clerk?.redirectToSignIn()
    }
    return Promise.reject(error)
  }
)

export default apiClient
```

### `apps/frontend/src/store/useBooksStore.ts`

```typescript
import { create } from 'zustand'
import type { Book } from '@ebook-mafia/types'
import apiClient from '@/api/client'

interface BooksState {
  books: Book[]
  loading: boolean
  error: string | null
  fetchBooks: () => Promise<void>
  addBook: (book: Book) => void
  updateBook: (id: string, updates: Partial<Book>) => void
  removeBook: (id: string) => void
}

export const useBooksStore = create<BooksState>((set) => ({
  books: [],
  loading: false,
  error: null,

  fetchBooks: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await apiClient.get<{ books: Book[] }>('/books')
      set({ books: data.books })
    } catch {
      set({ error: 'Failed to load books' })
    } finally {
      set({ loading: false })
    }
  },

  addBook: (book) =>
    set((state) => ({ books: [book, ...state.books] })),

  updateBook: (id, updates) =>
    set((state) => ({
      books: state.books.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  removeBook: (id) =>
    set((state) => ({ books: state.books.filter((b) => b.id !== id) })),
}))
```

### `apps/frontend/src/store/useChatStore.ts`

```typescript
import { create } from 'zustand'
import type { ChatMessage } from '@ebook-mafia/types'

interface ChatState {
  messages: Record<string, ChatMessage[]>  // keyed by bookId
  addMessage: (bookId: string, message: ChatMessage) => void
  clearMessages: (bookId: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: {},

  addMessage: (bookId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [bookId]: [...(state.messages[bookId] ?? []), message],
      },
    })),

  clearMessages: (bookId) =>
    set((state) => ({
      messages: { ...state.messages, [bookId]: [] },
    })),
}))
```

### `apps/frontend/src/hooks/useChat.ts`

```typescript
import { useState, useCallback } from 'react'
import type { Source } from '@ebook-mafia/types'

export function useChat(bookId: string) {
  const [streamingAnswer, setStreamingAnswer] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (query: string): Promise<string> => {
      setStreamingAnswer('')
      setSources([])
      setIsStreaming(true)
      setError(null)

      let fullAnswer = ''

      return new Promise<string>(async (resolve, reject) => {
        // SSE with token in query param (EventSource can't set headers)
        const token = await window.Clerk?.session?.getToken()
        if (!token) {
          setError('Not authenticated')
          setIsStreaming(false)
          reject(new Error('Not authenticated'))
          return
        }

        const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/chat/stream`)
        url.searchParams.set('query', query)
        url.searchParams.set('bookId', bookId)
        url.searchParams.set('token', token)

        const es = new EventSource(url.toString())

        es.addEventListener('token', (e) => {
          fullAnswer += e.data
          setStreamingAnswer((prev) => prev + e.data)
        })

        es.addEventListener('sources', (e) => {
          const parsedSources = JSON.parse(e.data) as Source[]
          setSources(parsedSources)
        })

        es.addEventListener('done', () => {
          es.close()
          setIsStreaming(false)
          resolve(fullAnswer)
        })

        es.addEventListener('error', (e) => {
          es.close()
          setIsStreaming(false)
          const errMsg = (e as any).data || 'Stream error'
          setError(errMsg)
          reject(new Error(errMsg))
        })

        es.onerror = () => {
          es.close()
          setIsStreaming(false)
          reject(new Error('Connection error'))
        }
      })
    },
    [bookId]
  )

  return { streamingAnswer, sources, isStreaming, error, sendMessage }
}
```

### `apps/frontend/src/hooks/useBooks.ts`

```typescript
import { useEffect } from 'react'
import { useBooksStore } from '@/store/useBooksStore'
import apiClient from '@/api/client'

export function useBooks() {
  const { books, loading, error, fetchBooks, addBook, updateBook, removeBook } = useBooksStore()

  useEffect(() => {
    fetchBooks()
  }, [])

  return { books, loading, error, addBook, updateBook, removeBook }
}

/**
 * Poll a book's processing status until it's ready or failed.
 * Call this after upload, pass in the bookId.
 */
export function pollBookStatus(bookId: string, onUpdate: (progress: number, status: string) => void) {
  const interval = setInterval(async () => {
    try {
      const { data } = await apiClient.get<{
        status: string
        processingProgress: number
      }>(`/books/${bookId}/status`)

      onUpdate(data.processingProgress, data.status)
      useBooksStore.getState().updateBook(bookId, {
        status: data.status as any,
        processingProgress: data.processingProgress,
      })

      if (data.status === 'ready' || data.status === 'failed') {
        clearInterval(interval)
      }
    } catch {
      clearInterval(interval)
    }
  }, 3000)

  return () => clearInterval(interval)
}
```

### `apps/frontend/src/components/ProtectedRoute.tsx`

```tsx
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'

interface Props {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: Props) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  )
}
```

### `apps/frontend/src/components/FileUploader.tsx`

```tsx
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, Loader2, CheckCircle, XCircle } from 'lucide-react'
import apiClient from '@/api/client'
import { useBooksStore } from '@/store/useBooksStore'
import { pollBookStatus } from '@/hooks/useBooks'
import type { Book } from '@ebook-mafia/types'

export function FileUploader() {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [stage, setStage] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle')

  const addBook = useBooksStore((s) => s.addBook)

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0]
    if (!file) return

    setStage('uploading')
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data } = await apiClient.post<{ bookId: string }>(
        '/books/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100))
          },
        }
      )

      setStage('processing')

      // Add placeholder book to store
      addBook({
        id: data.bookId,
        title: file.name.replace(/\.pdf$/i, ''),
        author: '',
        status: 'processing',
        processingProgress: 0,
        pageCount: 0,
        fileSize: file.size,
        createdAt: new Date().toISOString(),
      } as Book)

      // Poll until done
      const stop = pollBookStatus(data.bookId, (progress, status) => {
        setProcessingProgress(progress)
        if (status === 'ready') {
          setStage('done')
          setTimeout(() => setStage('idle'), 2000)
        } else if (status === 'failed') {
          setStage('error')
        }
      })

      // Clean up if component unmounts
      return stop
    } catch (err) {
      console.error('Upload failed:', err)
      setStage('error')
    }
  }, [addBook])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024,
    disabled: stage !== 'idle',
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
        transition-all duration-200 select-none
        ${isDragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-200 hover:border-gray-400'}
        ${stage !== 'idle' ? 'cursor-default' : ''}
      `}
    >
      <input {...getInputProps()} />

      {stage === 'idle' && (
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <UploadCloud className="h-12 w-12 text-gray-300" />
          <p className="font-medium text-gray-700">
            {isDragActive ? 'Drop it!' : 'Drop your PDF here'}
          </p>
          <p className="text-sm">or <span className="text-blue-500 underline">browse</span> · Max 100MB</p>
        </div>
      )}

      {stage === 'uploading' && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
          <p className="font-medium">Uploading... {uploadProgress}%</p>
          <div className="w-64 bg-gray-100 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {stage === 'processing' && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
          <p className="font-medium">Processing PDF... {processingProgress}%</p>
          <p className="text-sm text-gray-400">Extracting text · Embedding · Indexing</p>
          <div className="w-64 bg-gray-100 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${processingProgress}%` }}
            />
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div className="flex flex-col items-center gap-3 text-green-600">
          <CheckCircle className="h-12 w-12" />
          <p className="font-medium">Book ready!</p>
        </div>
      )}

      {stage === 'error' && (
        <div className="flex flex-col items-center gap-3 text-red-500">
          <XCircle className="h-12 w-12" />
          <p className="font-medium">Processing failed</p>
          <button
            onClick={(e) => { e.stopPropagation(); setStage('idle') }}
            className="text-sm underline text-blue-500"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
```

### `apps/frontend/src/components/PDFViewer.tsx`

```tsx
import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Required for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface Props {
  pdfUrl: string
  currentPage?: number
  onPageChange?: (page: number) => void
}

export function PDFViewer({ pdfUrl, currentPage = 1, onPageChange }: Props) {
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(currentPage)

  const goTo = (p: number) => {
    const clamped = Math.max(1, Math.min(p, numPages))
    setPage(clamped)
    onPageChange?.(clamped)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto flex justify-center bg-gray-100 p-4">
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<p className="text-gray-400 mt-20">Loading PDF…</p>}
        >
          <Page
            pageNumber={page}
            width={600}
            renderTextLayer
            renderAnnotationLayer
          />
        </Document>
      </div>

      <div className="flex items-center justify-center gap-4 py-3 border-t bg-white text-sm">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="text-gray-600">
          Page{' '}
          <input
            type="number"
            value={page}
            onChange={(e) => goTo(Number(e.target.value))}
            className="w-12 text-center border rounded px-1 py-0.5 text-sm"
          />
          {' '}of {numPages}
        </span>

        <button
          onClick={() => goTo(page + 1)}
          disabled={page >= numPages}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
```

### `apps/frontend/src/main.tsx`

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!PUBLISHABLE_KEY) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
)
```

### `apps/frontend/src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SignIn, SignUp } from '@clerk/clerk-react'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Landing from '@/pages/Landing'
import Dashboard from '@/pages/Dashboard'
import BookChat from '@/pages/books/BookChat'
import ReportBuilder from '@/pages/books/ReportBuilder'
import QuizView from '@/pages/books/QuizView'
import Summary from '@/pages/books/Summary'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Clerk handles auth UI — no custom login page needed */}
        <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
        <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />

        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/books/:id" element={
          <ProtectedRoute><BookChat /></ProtectedRoute>
        } />
        <Route path="/books/:id/report" element={
          <ProtectedRoute><ReportBuilder /></ProtectedRoute>
        } />
        <Route path="/books/:id/quiz" element={
          <ProtectedRoute><QuizView /></ProtectedRoute>
        } />
        <Route path="/books/:id/summary" element={
          <ProtectedRoute><Summary /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
```

### `apps/frontend/src/pages/Landing.tsx`

```tsx
import { SignInButton, SignUpButton } from '@clerk/clerk-react'

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <h1 className="text-5xl font-bold tracking-tight">📚 Ebook Mafia</h1>
      <p className="text-xl text-slate-400 max-w-md text-center">
        Upload any PDF. Ask questions, generate reports, create quizzes — powered by AI.
      </p>
      <div className="flex gap-4">
        <SignUpButton mode="redirect" redirectUrl="/dashboard">
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-colors">
            Get Started Free
          </button>
        </SignUpButton>
        <SignInButton mode="redirect" redirectUrl="/dashboard">
          <button className="px-6 py-3 border border-slate-600 hover:border-slate-400 rounded-xl font-medium transition-colors">
            Sign In
          </button>
        </SignInButton>
      </div>
    </div>
  )
}
```

### `apps/frontend/src/pages/Dashboard.tsx`

```tsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { FileUploader } from '@/components/FileUploader'
import { useBooksStore } from '@/store/useBooksStore'
import { BookOpen, Loader2, AlertCircle } from 'lucide-react'
import type { Book } from '@ebook-mafia/types'

function BookCard({ book }: { book: Book }) {
  const statusColors = {
    pending:    'text-gray-400',
    processing: 'text-yellow-500',
    ready:      'text-green-500',
    failed:     'text-red-500',
  }

  return (
    <Link
      to={book.status === 'ready' ? `/books/${book.id}` : '#'}
      className={`block p-4 border rounded-xl hover:shadow-md transition-shadow bg-white
        ${book.status !== 'ready' ? 'opacity-70 cursor-default' : ''}`}
    >
      <div className="flex items-start gap-3">
        <BookOpen className="h-8 w-8 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-medium truncate">{book.title}</p>
          <p className="text-sm text-gray-400">{book.pageCount} pages · {(book.fileSize / 1024 / 1024).toFixed(1)} MB</p>
          <div className="flex items-center gap-1 mt-1">
            {book.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />}
            {book.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-500" />}
            <span className={`text-xs capitalize ${statusColors[book.status]}`}>
              {book.status === 'processing'
                ? `Processing ${book.processingProgress}%`
                : book.status}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { books, loading, fetchBooks } = useBooksStore()

  useEffect(() => { fetchBooks() }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">📚 Ebook Mafia</h1>
        <UserButton afterSignOutUrl="/" />
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        <FileUploader />

        <section>
          <h2 className="text-lg font-semibold mb-4">Your Books</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
            </div>
          ) : books.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No books yet — upload a PDF above</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
```

### `apps/frontend/src/pages/books/BookChat.tsx`

```tsx
import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useChat } from '@/hooks/useChat'
import { PDFViewer } from '@/components/PDFViewer'
import { useBooksStore } from '@/store/useBooksStore'
import { Send, Loader2, ArrowLeft, FileText, HelpCircle, BookOpen } from 'lucide-react'
import type { Source } from '@ebook-mafia/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}

export default function BookChat() {
  const { id: bookId } = useParams<{ id: string }>()
  const books = useBooksStore((s) => s.books)
  const book = books.find((b) => b.id === bookId)

  const { streamingAnswer, sources, isStreaming, sendMessage } = useChat(bookId!)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [activePage, setActivePage] = useState(1)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingAnswer])

  const handleSend = async () => {
    const q = input.trim()
    if (!q || isStreaming) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])

    try {
      const answer = await sendMessage(q)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: answer, sources },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    }
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Left: PDF Viewer */}
      <div className="w-1/2 border-r flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Link to="/dashboard" className="p-1 rounded hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="font-medium text-sm truncate">{book?.title ?? 'Book'}</span>
          <div className="ml-auto flex gap-1">
            <Link to={`/books/${bookId}/report`} className="p-1.5 rounded hover:bg-gray-100" title="Report">
              <FileText className="h-4 w-4 text-gray-500" />
            </Link>
            <Link to={`/books/${bookId}/quiz`} className="p-1.5 rounded hover:bg-gray-100" title="Quiz">
              <HelpCircle className="h-4 w-4 text-gray-500" />
            </Link>
            <Link to={`/books/${bookId}/summary`} className="p-1.5 rounded hover:bg-gray-100" title="Summary">
              <BookOpen className="h-4 w-4 text-gray-500" />
            </Link>
          </div>
        </div>

        {book?.r2Url ? (
          <PDFViewer
            pdfUrl={book.r2Url}
            currentPage={activePage}
            onPageChange={setActivePage}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            PDF not available
          </div>
        )}
      </div>

      {/* Right: Chat */}
      <div className="w-1/2 flex flex-col">
        <div className="px-4 py-3 border-b">
          <p className="text-sm font-medium text-gray-700">Ask anything about this book</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-16 space-y-2">
              <p className="text-2xl">💬</p>
              <p className="text-sm">Ask a question to get started</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-sm rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                  ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>

              {/* Source citations */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 ml-1 space-y-1">
                  {msg.sources.map((s, si) => (
                    <button
                      key={si}
                      onClick={() => setActivePage(s.page)}
                      className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 hover:underline"
                    >
                      <FileText className="h-3 w-3" />
                      Page {s.page}: {s.chunk.slice(0, 60)}…
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex items-start gap-2">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-gray-800 max-w-sm">
                {streamingAnswer || (
                  <span className="flex items-center gap-1 text-gray-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                  </span>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask a question…"
              disabled={isStreaming}
              className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-40 transition-colors"
            >
              {isStreaming
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### `apps/frontend/src/pages/books/ReportBuilder.tsx`

```tsx
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Download } from 'lucide-react'
import apiClient from '@/api/client'
import type { ReportResponse } from '@ebook-mafia/types'

export default function ReportBuilder() {
  const { id: bookId } = useParams<{ id: string }>()
  const [topic, setTopic] = useState('')
  const [report, setReport] = useState<ReportResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data } = await apiClient.post<ReportResponse>('/reports/generate', {
        bookId,
        topic,
      })
      setReport(data)
    } catch {
      setError('Failed to generate report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async () => {
    if (!report) return
    const { data } = await apiClient.post('/reports/export-pdf', {
      markdown: report.markdown,
    }, { responseType: 'blob' })

    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${topic.replace(/\s+/g, '-')}.pdf`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link to={`/books/${bookId}`} className="p-1 rounded hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-semibold">Report Builder</h1>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-2xl border p-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Report Topic</span>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generate()}
              placeholder="e.g. Machine Learning fundamentals, Chapter 3 concepts..."
              className="mt-1 w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <button
            onClick={generate}
            disabled={loading || !topic.trim()}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : 'Generate Report'}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {report && (
          <div className="bg-white rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Generated Report</h2>
              <button
                onClick={downloadPDF}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-500"
              >
                <Download className="h-4 w-4" /> Download PDF
              </button>
            </div>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
              {report.markdown}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
```

### `apps/frontend/src/pages/books/QuizView.tsx`

```tsx
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react'
import apiClient from '@/api/client'
import type { QuizQuestion } from '@ebook-mafia/types'

export default function QuizView() {
  const { id: bookId } = useParams<{ id: string }>()
  const [topic, setTopic] = useState('')
  const [numQuestions, setNumQuestions] = useState(10)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setAnswers({})
    setSubmitted(false)
    try {
      const { data } = await apiClient.post<{ questions: QuizQuestion[] }>('/quiz/generate', {
        bookId, topic, numQuestions,
      })
      setQuestions(data.questions)
    } finally {
      setLoading(false)
    }
  }

  const score = questions.filter((q, i) => answers[i] === q.correctIndex).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link to={`/books/${bookId}`} className="p-1 rounded hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-semibold">Quiz Generator</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-2xl border p-6 space-y-4">
          <div className="flex gap-3">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Quiz topic..."
              className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>{n} Qs</option>
              ))}
            </select>
          </div>
          <button
            onClick={generate}
            disabled={loading || !topic.trim()}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : 'Generate Quiz'}
          </button>
        </div>

        {questions.length > 0 && (
          <>
            <div className="space-y-4">
              {questions.map((q, qi) => (
                <div key={qi} className="bg-white rounded-2xl border p-5 space-y-3">
                  <p className="font-medium text-sm">
                    <span className="text-gray-400 mr-2">Q{qi + 1}.</span>
                    {q.question}
                    <span className="ml-2 text-xs text-gray-400">[Page {q.page}]</span>
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const selected = answers[qi] === oi
                      const isCorrect = oi === q.correctIndex
                      let cls = 'border rounded-lg px-4 py-2 text-sm w-full text-left transition-colors '

                      if (!submitted) {
                        cls += selected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'hover:border-gray-300'
                      } else {
                        if (isCorrect) cls += 'border-green-500 bg-green-50 text-green-700'
                        else if (selected && !isCorrect) cls += 'border-red-500 bg-red-50 text-red-600'
                        else cls += 'opacity-50'
                      }

                      return (
                        <button
                          key={oi}
                          onClick={() => !submitted && setAnswers((a) => ({ ...a, [qi]: oi }))}
                          className={cls}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                  {submitted && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      {answers[qi] === q.correctIndex
                        ? <CheckCircle className="h-3 w-3 text-green-500" />
                        : <XCircle className="h-3 w-3 text-red-500" />
                      }
                      {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {!submitted ? (
              <button
                onClick={() => setSubmitted(true)}
                disabled={Object.keys(answers).length < questions.length}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-500 disabled:opacity-40 transition-colors"
              >
                Submit Quiz
              </button>
            ) : (
              <div className="bg-white rounded-2xl border p-6 text-center">
                <p className="text-3xl font-bold text-blue-600">{score}/{questions.length}</p>
                <p className="text-gray-500 mt-1">
                  {score === questions.length ? '🎉 Perfect score!' : `${Math.round((score / questions.length) * 100)}%`}
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
```

### `apps/frontend/src/pages/books/Summary.tsx`

```tsx
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import apiClient from '@/api/client'

export default function Summary() {
  const { id: bookId } = useParams<{ id: string }>()
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.post<{ summary: string }>('/reports/generate', {
        bookId,
        topic: 'Complete overview and summary of the entire book',
      })
      setSummary(data.markdown)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link to={`/books/${bookId}`} className="p-1 rounded hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-semibold">Book Summary</h1>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {!summary && (
          <div className="bg-white rounded-2xl border p-8 text-center space-y-4">
            <p className="text-gray-500">Generate an AI summary of the entire book</p>
            <button
              onClick={generate}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Summarizing (may take a minute)…</> : 'Generate Summary'}
            </button>
          </div>
        )}

        {summary && (
          <div className="bg-white rounded-2xl border p-6">
            <h2 className="font-semibold mb-4">Summary</h2>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
              {summary}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
```

---

## SETUP COMMANDS

```bash
# 1. Clone / scaffold
git clone ... && cd ebook-mafia

# 2. Install all packages (npm workspaces installs everything)
npm install

# 3. Copy env file and fill in your keys
cp .env.example apps/backend/.env
cp .env.example apps/frontend/.env   # only VITE_* vars needed

# 4. Start MongoDB + Redis locally
npm run docker:up

# 5. Terminal 1 — Backend API
npm run dev:backend

# 6. Terminal 2 — BullMQ Worker (separate process!)
npm run dev:worker

# 7. Terminal 3 — Frontend
npm run dev:frontend
```

### Cloudflare R2 Setup (5 minutes)

```
1. Go to https://dash.cloudflare.com → R2 Object Storage
2. Create a bucket named "ebook-mafia-pdfs"
3. Settings → Allow public access (or use custom domain)
4. Manage R2 API Tokens → Create token with Object Read & Write
5. Copy Account ID, Access Key ID, Secret Access Key → paste in .env
6. Copy the public URL → R2_PUBLIC_URL in .env
```

### Pinecone Setup

```
1. https://pinecone.io → Create account (free tier)
2. Create index: name="ebook-mafia", dimensions=768, metric=cosine, Serverless (AWS us-east-1)
3. Copy API key → PINECONE_API_KEY in .env
   (or let ensurePineconeIndex() create it automatically on first run)
```

---

## Key Differences from Original Plan

| Area | Original | This Version |
|---|---|---|
| Package manager | pnpm | **npm workspaces** |
| File storage | AWS S3 (paid after 12 months) | **Cloudflare R2 (free 10GB forever)** |
| S3 SDK | `@aws-sdk/client-s3` | **Same SDK** — only endpoint changes |
| Env vars | `AWS_BUCKET_NAME`, `AWS_ACCESS_KEY_ID` | `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `CLOUDFLARE_ACCOUNT_ID` |
| R2 client init | `region: 'ap-south-1'` | **`region: 'auto'`, custom endpoint** |
| Everything else | — | Identical |
```