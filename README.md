# 📚 Ebook Mafia — Full Project Plan (v3 · Pure TypeScript)

> An intelligent PDF/Ebook platform where users upload large books and interact with them through Q&A, report generation, summarization, and quiz creation — built on a **100% TypeScript** stack with Clerk authentication, LangChain.js, and Google Gemini.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Features](#2-core-features)
3. [Tech Stack](#3-tech-stack)
4. [Authentication Architecture — Clerk](#4-authentication-architecture--clerk)
5. [Architecture Overview](#5-architecture-overview)
6. [Monorepo Structure](#6-monorepo-structure)
7. [Phase-wise Implementation](#7-phase-wise-implementation)
   - [Phase 1 — Monorepo & Foundation](#phase-1--monorepo--foundation)
   - [Phase 2 — PDF Ingestion Pipeline](#phase-2--pdf-ingestion-pipeline)
   - [Phase 3 — Semantic Search & Q&A Engine](#phase-3--semantic-search--qa-engine)
   - [Phase 4 — Advanced Features](#phase-4--advanced-features)
   - [Phase 5 — Frontend & UX](#phase-5--frontend--ux)
   - [Phase 6 — Production & Deployment](#phase-6--production--deployment)
8. [Key Implementation Notes](#8-key-implementation-notes)

---

## 1. Project Overview

**Ebook Mafia** is an AI-powered ebook companion built entirely in TypeScript. Users can:

- Upload any large PDF (textbooks, research papers, novels, manuals)
- Ask natural language questions and get grounded, cited answers
- Generate structured reports on any topic from the book
- Create quizzes, flashcards, and chapter summaries
- Extract images from PDFs and embed them in generated reports
- Use it as a study assistant, research helper, or knowledge base

The system uses a **RAG (Retrieval-Augmented Generation)** pipeline: PDFs are chunked, embedded with Gemini, stored in Pinecone, and retrieved at query time for grounded generation. Everything — frontend, backend, workers, shared types — is TypeScript.

---

## 2. Core Features

| Feature | Description | Priority |
|---|---|---|
| **PDF Upload** | Support large files (100MB+), multi-PDF per user | P0 |
| **Q&A Chat** | Conversational Q&A grounded in book content, with memory | P0 |
| **Report Generation** | Structured reports on any topic from the book | P0 |
| **Citation with Page Numbers** | Every answer cites the exact source page | P0 |
| **Summarization** | Chapter-wise or full book summaries | P1 |
| **Quiz / Flashcard Generator** | MCQs, true/false, fill-in-the-blank, flashcards | P1 |
| **Image Extraction** | Pull images from PDFs and embed in reports | P1 |
| **Multi-book Chat** | Query across multiple uploaded books simultaneously | P2 |
| **Export** | Download reports as PDF/DOCX | P1 |

---

## 3. Tech Stack

### Backend (Node.js + TypeScript)

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js 20 LTS | Server runtime |
| **Framework** | Hono.js | Fast, lightweight web framework with great TypeScript support |
| **Language** | TypeScript 5.x (strict) | Type-safe backend |
| **AI Orchestration** | LangChain.js (`langchain`) | Chains, agents, retrievers |
| **LLM** | Google Gemini 1.5 Pro / Flash | Generation & reasoning |
| **Embeddings** | Gemini `text-embedding-004` via `@langchain/google-genai` | Semantic encoding |
| **Vector Store** | Pinecone via `@langchain/pinecone` | Semantic search |
| **PDF Parsing** | `pdf-parse` + `pdfjs-dist` | Text extraction with page numbers |
| **Image Extraction** | `pdfjs-dist` (canvas renderer) | Extract embedded images |
| **File Storage** | AWS S3 via `@aws-sdk/client-s3` | Raw PDF storage |
| **Database** | MongoDB via `mongoose` | User data, book metadata, chat history |
| **Cache** | Redis via `ioredis` | Query caching, job state |
| **Job Queue** | BullMQ (Redis-backed) | Async PDF processing |
| **Report Export** | `pdfkit` + `docx` | PDF/DOCX generation |
| **Auth** | **Clerk** — verified via `@clerk/backend` | JWT verification, no custom auth |
| **Validation** | Zod | Runtime type validation |

### Frontend (Vite + React + TypeScript)

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Vite + React 18 + TypeScript | Fast SPA |
| **Auth** | `@clerk/clerk-react` | Drop-in auth UI + session management |
| **UI Library** | shadcn/ui + Tailwind CSS | Component library |
| **PDF Viewer** | `react-pdf` | In-browser PDF display |
| **Chat UI** | Custom SSE streaming component | Real-time streaming chat |
| **State Management** | Zustand | Client-side state |
| **File Upload** | `react-dropzone` | Drag-and-drop upload |
| **HTTP Client** | Axios | API requests with auth interceptors |
| **Routing** | React Router v6 | Client-side routing |
| **Forms** | React Hook Form + Zod | Validated forms |

### Shared

| Tool | Purpose |
|---|---|
| `pnpm` workspaces | Monorepo package manager |
| `packages/types` | Shared TypeScript types (API contracts) |
| `packages/config` | Shared ESLint, TypeScript, Tailwind configs |

### Infrastructure

| Tool | Purpose |
|---|---|
| Docker + Docker Compose | Local dev containerization |
| Railway / Render | Backend hosting |
| Vercel | Frontend hosting |
| Pinecone Serverless | Managed vector DB |
| AWS S3 | PDF file storage |
| MongoDB Atlas | Managed MongoDB (production) |
| Upstash Redis | Managed Redis (production) |
| GitHub Actions | CI/CD pipeline |

---

## 4. Authentication Architecture — Clerk

Clerk is the **only** authentication system in this project. There is no custom JWT signing, no password hashing, no refresh token logic. Clerk handles all of that. Your backend simply **verifies** Clerk's tokens.

### 4.1 How It Works — End to End

```
┌─────────────────────────────────────────────────────────────┐
│                        AUTH FLOW                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User signs up / logs in via Clerk (frontend)            │
│     → Clerk issues a signed JWT (RS256)                     │
│     → JWT contains: sub (Clerk user ID), email, metadata    │
│                                                             │
│  2. Frontend attaches JWT to every API request              │
│     Authorization: Bearer <clerk_session_token>             │
│                                                             │
│  3. Hono middleware on the backend intercepts the request   │
│     → Uses @clerk/backend to verify the JWT                 │
│     → Extracts userId (Clerk's "sub")                       │
│     → Rejects with 401 if token is missing or invalid       │
│                                                             │
│  4. Clerk userId is the primary user identifier             │
│     → Used as MongoDB user reference                        │
│     → Used as Pinecone namespace: user_<clerkId>_book_<id>  │
│     → Controls data isolation between users                 │
│                                                             │
│  ✅ No password fields in DB                                │
│  ✅ No custom token signing                                 │
│  ✅ No /auth/login or /auth/register routes needed          │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Frontend — Clerk Setup

**Install:**
```bash
npm install @clerk/clerk-react
```

**Environment:**
```env
# frontend/.env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
VITE_API_BASE_URL=http://localhost:3001/api
```

**Wrap the app:**
```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!PUBLISHABLE_KEY) throw new Error('Missing Clerk Publishable Key')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
)
```

**Protect routes:**
```tsx
// src/components/ProtectedRoute.tsx
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  )
}
```

```tsx
// src/App.tsx
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

        {/* Clerk handles all auth UI — no custom Login/Register pages needed */}
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

**Attach token to every Axios request:**
```typescript
// src/api/client.ts
import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

// Intercept every outgoing request — attach Clerk JWT
apiClient.interceptors.request.use(async (config) => {
  // window.Clerk is globally available after ClerkProvider mounts
  const token = await window.Clerk?.session?.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally — redirect to sign-in
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

**Global type declaration for `window.Clerk`:**
```typescript
// src/types/clerk.d.ts
interface Window {
  Clerk?: {
    session?: {
      getToken: (options?: { template?: string }) => Promise<string | null>
    }
    redirectToSignIn: () => void
  }
}
```

**Using Clerk hooks in components:**
```tsx
import { useUser, useAuth } from '@clerk/clerk-react'

function ProfileHeader() {
  const { user, isLoaded } = useUser()
  const { signOut } = useAuth()

  if (!isLoaded) return <Skeleton />

  return (
    <header>
      <span>{user?.firstName} ({user?.primaryEmailAddress?.emailAddress})</span>
      <button onClick={() => signOut()}>Sign Out</button>
    </header>
  )
}
```

**SSE streaming with Clerk token** — `EventSource` doesn't support headers, so pass the token as a query param:
```typescript
// src/hooks/useChat.ts
import { useState } from 'react'

export function useChat(bookId: string) {
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<Source[]>([])

  const sendMessage = async (query: string) => {
    setAnswer('')
    setSources([])

    // Get fresh token for SSE (EventSource can't set headers)
    const token = await window.Clerk?.session?.getToken()

    const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/chat/stream`)
    url.searchParams.set('query', query)
    url.searchParams.set('bookId', bookId)
    url.searchParams.set('token', token ?? '')

    const es = new EventSource(url.toString())

    es.addEventListener('token', (e) => {
      setAnswer((prev) => prev + e.data)
    })

    es.addEventListener('sources', (e) => {
      setSources(JSON.parse(e.data))
    })

    es.addEventListener('done', () => es.close())
    es.onerror = () => es.close()
  }

  return { answer, sources, sendMessage }
}
```

### 4.3 Backend — Clerk JWT Verification (Hono + TypeScript)

**Install:**
```bash
pnpm add @clerk/backend hono @hono/node-server
```

**Environment:**
```env
# backend/.env
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
```

**Clerk auth middleware for Hono:**
```typescript
// src/middleware/clerkAuth.ts
import { createClerkClient } from '@clerk/backend'
import { Context, Next } from 'hono'
import { env } from '../config/env'

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
    const payload = await clerk.verifyToken(token)

    // Attach userId to context for use in route handlers
    c.set('userId', payload.sub)        // Clerk user ID (e.g. "user_2abc...")
    c.set('clerkPayload', payload)

    await next()
  } catch (err) {
    return c.json({ error: 'Unauthorized — invalid token' }, 401)
  }
}
```

**Typed context — extend Hono's context variables:**
```typescript
// src/types/hono.ts
import type { ClerkJWTPayload } from '@clerk/backend'

export type AppVariables = {
  userId: string
  clerkPayload: ClerkJWTPayload
}
```

**Apply middleware to protected routes:**
```typescript
// src/index.ts
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { clerkAuthMiddleware } from './middleware/clerkAuth'
import booksRouter from './routers/books'
import chatRouter from './routers/chat'
import reportsRouter from './routers/reports'
import quizRouter from './routers/quiz'
import type { AppVariables } from './types/hono'

const app = new Hono<{ Variables: AppVariables }>()

// CORS — allow frontend origins
app.use('*', cors({
  origin: [
    'http://localhost:5173',
    'https://your-app.vercel.app'
  ],
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

// Health check — public
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// All /api/* routes are protected by Clerk
app.use('/api/*', clerkAuthMiddleware)

app.route('/api/books',   booksRouter)
app.route('/api/chat',    chatRouter)
app.route('/api/reports', reportsRouter)
app.route('/api/quiz',    quizRouter)

// No /api/auth router — Clerk handles auth entirely

serve({ fetch: app.fetch, port: 3001 }, () => {
  console.log('🚀 Server running on http://localhost:3001')
})
```

**Using userId in route handlers:**
```typescript
// src/routers/books.ts
import { Hono } from 'hono'
import type { AppVariables } from '../types/hono'
import { BookModel } from '../models/book'

const router = new Hono<{ Variables: AppVariables }>()

router.get('/', async (c) => {
  const userId = c.get('userId')  // typed, guaranteed to exist past middleware

  const books = await BookModel.find({ ownerClerkId: userId })
    .sort({ createdAt: -1 })
    .lean()

  return c.json({ books })
})

router.post('/upload', async (c) => {
  const userId = c.get('userId')
  const formData = await c.req.formData()
  const file = formData.get('file') as File

  if (!file || !file.name.endsWith('.pdf')) {
    return c.json({ error: 'Only PDF files are accepted' }, 400)
  }

  // ... rest of upload logic
})

export default router
```

### 4.4 MongoDB User Model — No Password Field

```typescript
// src/models/user.ts
import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  clerkUserId: string   // Clerk's user ID — the primary identifier
  email: string         // synced from Clerk token
  isActive: boolean
  lastSeen: Date
  createdAt: Date
}

const UserSchema = new Schema<IUser>({
  clerkUserId: { type: String, required: true, unique: true, index: true },
  email:        { type: String, default: '' },
  isActive:     { type: Boolean, default: true },
  lastSeen:     { type: Date, default: Date.now },
}, { timestamps: true })

export const UserModel = mongoose.model<IUser>('User', UserSchema)
```

**Auto-upsert user on first request** — add this to the middleware or a separate `syncUser` helper:

```typescript
// src/middleware/syncUser.ts
import { Context, Next } from 'hono'
import { UserModel } from '../models/user'
import type { AppVariables } from '../types/hono'

// Run after clerkAuthMiddleware — syncs user into MongoDB on first login
export async function syncUserMiddleware(c: Context<{ Variables: AppVariables }>, next: Next) {
  const userId = c.get('userId')
  const payload = c.get('clerkPayload')

  await UserModel.findOneAndUpdate(
    { clerkUserId: userId },
    {
      $set:        { email: payload.email ?? '', lastSeen: new Date() },
      $setOnInsert: { clerkUserId: userId, isActive: true },
    },
    { upsert: true }
  )

  await next()
}
```

---

## 5. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│              Vite + React + TypeScript Frontend                  │
│                                                                  │
│  ┌───────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│  │  Clerk    │  │  React       │  │  Zustand               │    │
│  │  Auth UI  │  │  Router v6   │  │  (books, ui state)     │    │
│  └───────────┘  └──────────────┘  └────────────────────────┘    │
│                                                                  │
│  Every request → Axios interceptor attaches Clerk JWT            │
└────────────────────────────┬─────────────────────────────────────┘
                             │  HTTPS + Bearer Token
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Hono.js Backend (TypeScript)                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  clerkAuthMiddleware → @clerk/backend verifyToken()        │  │
│  │  syncUserMiddleware  → upsert user in MongoDB              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ /books   │  │ /chat    │  │ /reports │  │ /quiz        │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              LangChain.js Chain Layer                      │  │
│  │   Retriever → Pinecone → Gemini Pro/Flash → SSE Stream     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────┬───────────────────┘
                   │                           │
       ┌───────────▼──────────┐   ┌────────────▼────────────┐
       │   BullMQ Worker      │   │   External Services     │
       │  (PDF ingestion)     │   │                         │
       │                      │   │  • Pinecone (vectors)   │
       │ 1. pdf-parse extract │   │  • MongoDB Atlas        │
       │ 2. Chunk text        │   │  • AWS S3 (files)       │
       │ 3. Gemini embed      │   │  • Upstash Redis        │
       │ 4. Upsert Pinecone   │   │  • Clerk (auth)         │
       └──────────────────────┘   └─────────────────────────┘
```

---

## 6. Monorepo Structure

```
ebook-mafia/                          ← pnpm workspace root
│
├── package.json                      ← workspace config
├── pnpm-workspace.yaml
├── docker-compose.yml
├── .env.example
├── .gitignore
│
├── packages/
│   ├── types/                        ← shared TypeScript types
│   │   ├── package.json
│   │   └── src/
│   │       ├── api.ts                ← API request/response types
│   │       ├── models.ts             ← shared model types
│   │       └── index.ts
│   │
│   └── config/                       ← shared configs
│       ├── eslint.config.js
│       ├── tsconfig.base.json
│       └── tailwind.config.ts
│
├── apps/
│   ├── backend/                      ← Hono.js API + BullMQ workers
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── index.ts              ← Hono entry point
│   │       ├── config/
│   │       │   ├── env.ts            ← Zod-validated env vars
│   │       │   ├── db.ts             ← Mongoose connection
│   │       │   ├── redis.ts          ← ioredis + BullMQ setup
│   │       │   └── pinecone.ts       ← Pinecone client init
│   │       ├── middleware/
│   │       │   ├── clerkAuth.ts      ← JWT verification
│   │       │   └── syncUser.ts       ← MongoDB user upsert
│   │       ├── routers/
│   │       │   ├── books.ts
│   │       │   ├── chat.ts
│   │       │   ├── reports.ts
│   │       │   └── quiz.ts
│   │       ├── services/
│   │       │   ├── pdfIngestion.ts   ← pdf-parse text + image extraction
│   │       │   ├── chunker.ts        ← LangChain.js text splitting
│   │       │   ├── embedder.ts       ← Gemini embeddings + Pinecone upsert
│   │       │   ├── qaService.ts      ← RAG chain (Gemini + Pinecone)
│   │       │   ├── reportService.ts  ← Report generation + export
│   │       │   └── quizService.ts    ← Quiz generation (Gemini Flash)
│   │       ├── workers/
│   │       │   └── pdfWorker.ts      ← BullMQ worker (ingestion pipeline)
│   │       ├── models/
│   │       │   ├── user.ts
│   │       │   ├── book.ts
│   │       │   ├── conversation.ts
│   │       │   └── message.ts
│   │       └── types/
│   │           ├── hono.ts           ← AppVariables type
│   │           └── env.ts            ← Env type
│   │
│   └── frontend/                     ← Vite + React + TypeScript
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── pages/
│           │   ├── Landing.tsx
│           │   ├── Dashboard.tsx
│           │   └── books/
│           │       ├── BookChat.tsx
│           │       ├── ReportBuilder.tsx
│           │       ├── QuizView.tsx
│           │       └── Summary.tsx
│           ├── components/
│           │   ├── ProtectedRoute.tsx
│           │   ├── ChatPanel.tsx
│           │   ├── PDFViewer.tsx
│           │   ├── FileUploader.tsx
│           │   └── QuizUI.tsx
│           ├── store/
│           │   ├── useBooksStore.ts
│           │   └── useChatStore.ts
│           ├── hooks/
│           │   ├── useChat.ts        ← SSE streaming hook
│           │   └── useBooks.ts
│           ├── api/
│           │   └── client.ts         ← Axios + Clerk interceptor
│           └── types/
│               ├── clerk.d.ts        ← window.Clerk global type
│               └── index.ts
```

---

## 7. Phase-wise Implementation

---

### Phase 1 — Monorepo & Foundation

**Duration:** Week 1
**Goal:** Monorepo scaffolded, Clerk auth working end-to-end, MongoDB + Redis connected.

#### 1.1 Monorepo Init

```bash
mkdir ebook-mafia && cd ebook-mafia
pnpm init

# pnpm-workspace.yaml
cat > pnpm-workspace.yaml << EOF
packages:
  - 'apps/*'
  - 'packages/*'
EOF

mkdir -p apps/backend apps/frontend packages/types packages/config
```

#### 1.2 Backend Init

```bash
cd apps/backend
pnpm init
pnpm add hono @hono/node-server @clerk/backend \
  langchain @langchain/google-genai @langchain/pinecone \
  @pinecone-database/pinecone \
  mongoose ioredis bullmq \
  @aws-sdk/client-s3 @aws-sdk/lib-storage \
  pdf-parse pdfjs-dist \
  pdfkit docx \
  zod dotenv

pnpm add -D typescript tsx @types/node @types/pdf-parse \
  nodemon ts-node

# tsconfig.json
cat > tsconfig.json << EOF
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["src"]
}
EOF
```

#### 1.3 Frontend Init

```bash
cd apps/frontend
pnpm create vite . -- --template react-ts
pnpm add @clerk/clerk-react react-router-dom zustand \
  axios react-dropzone react-pdf \
  lucide-react react-hook-form @hookform/resolvers zod

pnpm add -D tailwindcss @tailwindcss/vite @types/node
npx shadcn-ui@latest init
```

#### 1.4 Shared Types Package

```typescript
// packages/types/src/api.ts
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
  options: [string, string, string, string]  // always 4
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
```

#### 1.5 Environment Variables — Backend

```typescript
// src/config/env.ts
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
  PINECONE_CLOUD:         z.string().default('aws'),
  PINECONE_REGION:        z.string().default('us-east-1'),

  // MongoDB
  MONGODB_URL:            z.string().url(),

  // Redis
  REDIS_URL:              z.string().url(),

  // AWS S3
  AWS_BUCKET_NAME:        z.string().min(1),
  AWS_ACCESS_KEY_ID:      z.string().min(1),
  AWS_SECRET_ACCESS_KEY:  z.string().min(1),
  AWS_REGION:             z.string().default('ap-south-1'),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>
```

#### 1.6 MongoDB Models

```typescript
// src/models/book.ts
import mongoose, { Schema, Document } from 'mongoose'

export interface IBook extends Document {
  title: string
  author: string
  ownerClerkId: string        // Clerk user ID — no FK to users table
  s3Key: string
  s3Url: string
  fileSize: number
  pageCount: number
  status: 'pending' | 'processing' | 'ready' | 'failed'
  processingProgress: number  // 0–100
  pineconeNamespace: string   // user_<clerkId>_book_<id>
  createdAt: Date
  updatedAt: Date
}

const BookSchema = new Schema<IBook>({
  title:               { type: String, required: true },
  author:              { type: String, default: '' },
  ownerClerkId:        { type: String, required: true, index: true },
  s3Key:               { type: String, default: '' },
  s3Url:               { type: String, default: '' },
  fileSize:            { type: Number, default: 0 },
  pageCount:           { type: Number, default: 0 },
  status:              { type: String, enum: ['pending', 'processing', 'ready', 'failed'], default: 'pending' },
  processingProgress:  { type: Number, default: 0, min: 0, max: 100 },
  pineconeNamespace:   { type: String, default: '' },
}, { timestamps: true })

export const BookModel = mongoose.model<IBook>('Book', BookSchema)
```

```typescript
// src/models/conversation.ts
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

// src/models/message.ts
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

#### 1.7 Docker Compose (Dev)

```yaml
# docker-compose.yml
version: "3.9"

services:
  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongo_data:/data/db]
    environment:
      MONGO_INITDB_DATABASE: ebookmafia

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  # Pinecone + Clerk + AWS S3 are external cloud services
  # No containers needed for them

volumes:
  mongo_data:
```

**Deliverable:** Monorepo running, Clerk JWT verification working locally, MongoDB + Redis connected.

---

### Phase 2 — PDF Ingestion Pipeline

**Duration:** Week 2
**Goal:** Upload PDF → S3 → BullMQ job → extract text/images → chunk → Gemini embed → Pinecone.

#### 2.1 S3 Upload + Job Enqueue

```typescript
// src/routers/books.ts (upload endpoint)
import { Hono } from 'hono'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { Queue } from 'bullmq'
import { BookModel } from '../models/book'
import { env } from '../config/env'
import type { AppVariables } from '../types/hono'

const router = new Hono<{ Variables: AppVariables }>()
const s3 = new S3Client({ region: env.AWS_REGION })
const ingestionQueue = new Queue('pdf-ingestion', {
  connection: { url: env.REDIS_URL }
})

router.post('/upload', async (c) => {
  const userId = c.get('userId')
  const formData = await c.req.formData()
  const file = formData.get('file') as File

  if (!file?.name.endsWith('.pdf')) {
    return c.json({ error: 'Only PDF files are accepted' }, 400)
  }
  if (file.size > 100 * 1024 * 1024) {
    return c.json({ error: 'File too large (max 100MB)' }, 413)
  }

  // Create book record in MongoDB
  const book = await BookModel.create({
    title: file.name.replace('.pdf', ''),
    ownerClerkId: userId,
    fileSize: file.size,
    status: 'pending',
  })

  const s3Key = `pdfs/${userId}/${book.id}.pdf`

  // Upload to S3
  const buffer = Buffer.from(await file.arrayBuffer())
  await s3.send(new PutObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key: s3Key,
    Body: buffer,
    ContentType: 'application/pdf',
  }))

  // Update book with S3 key
  book.s3Key = s3Key
  book.s3Url = `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${s3Key}`
  book.pineconeNamespace = `user_${userId}_book_${book.id}`
  await book.save()

  // Enqueue ingestion job (async — don't await)
  await ingestionQueue.add('ingest-pdf', {
    bookId: book.id,
    s3Key,
    userId,
    namespace: book.pineconeNamespace,
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 }
  })

  return c.json({ bookId: book.id, status: 'processing' }, 202)
})

export default router
```

#### 2.2 BullMQ Worker — Full Ingestion Pipeline

```typescript
// src/workers/pdfWorker.ts
import { Worker, Job } from 'bullmq'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { extractTextWithPages, extractImages } from '../services/pdfIngestion'
import { chunkPages } from '../services/chunker'
import { embedAndUpsert } from '../services/embedder'
import { BookModel } from '../models/book'
import { env } from '../config/env'

const s3 = new S3Client({ region: env.AWS_REGION })

interface IngestionJobData {
  bookId: string
  s3Key: string
  userId: string
  namespace: string
}

const worker = new Worker<IngestionJobData>(
  'pdf-ingestion',
  async (job: Job<IngestionJobData>) => {
    const { bookId, s3Key, userId, namespace } = job.data

    await BookModel.updateOne({ _id: bookId }, { status: 'processing', processingProgress: 5 })

    // Step 1: Download PDF from S3 into a Buffer
    const s3Response = await s3.send(new GetObjectCommand({
      Bucket: env.AWS_BUCKET_NAME,
      Key: s3Key,
    }))
    const pdfBuffer = Buffer.from(await s3Response.Body!.transformToByteArray())

    await BookModel.updateOne({ _id: bookId }, { processingProgress: 15 })

    // Step 2: Extract text with page numbers
    const pages = await extractTextWithPages(pdfBuffer)

    await BookModel.updateOne({ _id: bookId }, {
      processingProgress: 35,
      pageCount: pages.length
    })

    // Step 3: Extract and save images
    await extractImages(pdfBuffer, bookId, userId)

    await BookModel.updateOne({ _id: bookId }, { processingProgress: 55 })

    // Step 4: Chunk into LangChain Documents
    const chunks = chunkPages(pages, bookId)

    await BookModel.updateOne({ _id: bookId }, { processingProgress: 70 })

    // Step 5: Embed with Gemini + upsert into Pinecone
    await embedAndUpsert(chunks, namespace)

    // Done!
    await BookModel.updateOne({ _id: bookId }, {
      status: 'ready',
      processingProgress: 100,
    })

    console.log(`✅ Book ${bookId} ingested — ${chunks.length} chunks in namespace ${namespace}`)
  },
  { connection: { url: env.REDIS_URL } }
)

worker.on('failed', async (job, err) => {
  if (job) {
    await BookModel.updateOne({ _id: job.data.bookId }, { status: 'failed' })
    console.error(`❌ Job ${job.id} failed:`, err.message)
  }
})

export default worker
```

#### 2.3 PDF Text Extraction (TypeScript)

```typescript
// src/services/pdfIngestion.ts
import pdfParse from 'pdf-parse'

export interface PageData {
  page: number
  text: string
}

export async function extractTextWithPages(pdfBuffer: Buffer): Promise<PageData[]> {
  const pages: PageData[] = []

  await pdfParse(pdfBuffer, {
    pagerender: (pageData: any) => {
      return pageData.getTextContent().then((content: any) => {
        const text = content.items
          .map((item: any) => item.str)
          .join(' ')
          .trim()

        if (text.length > 0) {
          pages.push({ page: pageData.pageIndex + 1, text })
        }

        return text
      })
    }
  })

  return pages
}

export async function extractImages(
  pdfBuffer: Buffer,
  bookId: string,
  userId: string
): Promise<void> {
  // pdfjs-dist renders pages to canvas — extract images from XObject streams
  // Save to S3 under images/<userId>/<bookId>/page<N>_img<M>.png
  // Save metadata to MongoDB book_images collection
  // (implementation uses pdfjs-dist getOperatorList + OPS.paintImageXObject)
}
```

#### 2.4 Chunking (LangChain.js)

```typescript
// src/services/chunker.ts
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { Document } from 'langchain/document'
import type { PageData } from './pdfIngestion'

export function chunkPages(pages: PageData[], bookId: string): Document[] {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 150,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  })

  const allChunks: Document[] = []

  for (const page of pages) {
    const chunks = splitter.splitText(page.text)

    chunks.forEach((chunk, idx) => {
      allChunks.push(new Document({
        pageContent: chunk,
        metadata: {
          bookId,
          page: page.page,
          chunkId: `${bookId}-${page.page}-${idx}`,
        },
      }))
    })
  }

  return allChunks
}
```

#### 2.5 Gemini Embeddings + Pinecone Upsert

```typescript
// src/services/embedder.ts
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { PineconeStore } from '@langchain/pinecone'
import { Pinecone } from '@pinecone-database/pinecone'
import { Document } from 'langchain/document'
import { env } from '../config/env'

const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY })

export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'text-embedding-004',   // 768 dimensions
  apiKey: env.GOOGLE_API_KEY,
})

export async function embedAndUpsert(
  chunks: Document[],
  namespace: string
): Promise<void> {
  const index = pc.index(env.PINECONE_INDEX_NAME)

  // Batch upsert in groups of 100 to avoid rate limits
  const batchSize = 100
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    await PineconeStore.fromDocuments(batch, embeddings, {
      pineconeIndex: index,
      namespace,
    })
    console.log(`  Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`)
  }
}

export function getVectorStore(namespace: string): Promise<PineconeStore> {
  const index = pc.index(env.PINECONE_INDEX_NAME)
  return PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    namespace,
  })
}
```

**Deliverable:** Upload PDF → S3 → BullMQ → ingested into Pinecone → book status = "ready".

---

### Phase 3 — Semantic Search & Q&A Engine

**Duration:** Week 3
**Goal:** User asks a question → retrieve chunks from Pinecone → Gemini answers with page citations → SSE stream to frontend.

#### 3.1 RAG Chain (LangChain.js + Gemini)

```typescript
// src/services/qaService.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { createRetrievalChain } from 'langchain/chains/retrieval'
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { getVectorStore } from './embedder'
import { env } from '../config/env'

const llmPro = new ChatGoogleGenerativeAI({
  model: 'gemini-1.5-pro',
  temperature: 0.2,
  apiKey: env.GOOGLE_API_KEY,
  streaming: true,
})

const RAG_PROMPT = ChatPromptTemplate.fromTemplate(`
You are an intelligent assistant helping a user understand an ebook.
Answer ONLY using the context below. Always cite the page number(s) from which you derived your answer.
If the answer is not in the context, say exactly: "This information is not available in the book."

Context:
{context}

Question: {input}

Answer (include page citations like [Page 34]):
`)

export async function buildQAChain(namespace: string) {
  const vectorStore = await getVectorStore(namespace)
  const retriever = vectorStore.asRetriever({ k: 6 })

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

#### 3.2 Chat Endpoint with SSE Streaming

```typescript
// src/routers/chat.ts
import { Hono, Context } from 'hono'
import { streamSSE } from 'hono/streaming'
import { buildQAChain } from '../services/qaService'
import { BookModel } from '../models/book'
import { ConversationModel } from '../models/conversation'
import { MessageModel } from '../models/message'
import type { AppVariables } from '../types/hono'

const router = new Hono<{ Variables: AppVariables }>()

// SSE streaming chat
router.get('/stream', async (c) => {
  const userId = c.get('userId')
  const query   = c.req.query('query')
  const bookId  = c.req.query('bookId')

  if (!query || !bookId) {
    return c.json({ error: 'Missing query or bookId' }, 400)
  }

  // Verify user owns this book
  const book = await BookModel.findOne({ _id: bookId, ownerClerkId: userId, status: 'ready' })
  if (!book) return c.json({ error: 'Book not found or not ready' }, 404)

  return streamSSE(c, async (stream) => {
    let fullAnswer = ''
    const chain = await buildQAChain(book.pineconeNamespace)

    const result = await chain.stream({ input: query })

    for await (const chunk of result) {
      if (chunk.answer) {
        fullAnswer += chunk.answer
        // Send each token as an SSE event
        await stream.writeSSE({ data: chunk.answer, event: 'token' })
      }
    }

    // Send source documents at the end
    const sources = (result as any).sourceDocuments?.map((doc: any) => ({
      page:   doc.metadata.page,
      chunk:  doc.pageContent.slice(0, 200),
      bookId: doc.metadata.bookId,
    })) ?? []

    await stream.writeSSE({ data: JSON.stringify(sources), event: 'sources' })
    await stream.writeSSE({ data: 'done', event: 'done' })

    // Persist message to MongoDB
    await MessageModel.create([
      { conversationId: bookId, role: 'user',      content: query,       sources: [] },
      { conversationId: bookId, role: 'assistant', content: fullAnswer,  sources },
    ])
  })
})

export default router
```

#### 3.3 Conversational Memory

For multi-turn conversations, include chat history in the prompt:

```typescript
// src/services/qaService.ts (updated for memory)
import { BufferWindowMemory } from 'langchain/memory'
import { ConversationalRetrievalQAChain } from 'langchain/chains'

export async function buildConversationalChain(namespace: string) {
  const vectorStore = await getVectorStore(namespace)

  const memory = new BufferWindowMemory({
    memoryKey: 'chat_history',
    returnMessages: true,
    k: 10,  // last 10 exchanges
    inputKey: 'question',
    outputKey: 'text',
  })

  return ConversationalRetrievalQAChain.fromLLM(
    llmPro,
    vectorStore.asRetriever({ k: 6 }),
    {
      memory,
      returnSourceDocuments: true,
      verbose: false,
    }
  )
}
```

#### 3.4 Standard JSON Response (Non-streaming)

```typescript
// For report generation and quiz — non-streaming response format
interface ChatApiResponse {
  answer: string
  sources: Array<{
    page:   number
    chunk:  string
    bookId: string
  }>
}
```

**Deliverable:** `/chat/stream` SSE endpoint with Gemini, Pinecone retrieval, and page citations.

---

### Phase 4 — Advanced Features

**Duration:** Weeks 4–5
**Goal:** Reports, summaries, quizzes, multi-book support, image-aware generation.

#### 4.1 Report Generation

```typescript
// src/services/reportService.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { PromptTemplate } from '@langchain/core/prompts'
import { LLMChain } from 'langchain/chains'
import { getVectorStore } from './embedder'
import PDFDocument from 'pdfkit'
import { Document as DocxDocument, Packer, Paragraph, HeadingLevel } from 'docx'
import { env } from '../config/env'

const REPORT_PROMPT = PromptTemplate.fromTemplate(`
You are a report writer. Based ONLY on the following book excerpts, 
write a detailed, well-structured report on the topic: {topic}.

Structure your report exactly as:
# Introduction
[introduction text]

# Key Concepts
[key concepts]

# Detailed Explanation
[detailed content]

# Examples and Case Studies
[if present in the text, otherwise state "None found in provided excerpts"]

# Conclusion
[conclusion]

# Page References
[list all pages cited]

Book Excerpts:
{context}
`)

export async function generateReport(
  topic: string,
  namespace: string,
): Promise<{ markdown: string; sources: any[] }> {
  const vectorStore = await getVectorStore(namespace)
  const retriever = vectorStore.asRetriever({ k: 12 }) // more chunks for a report

  const docs = await retriever.getRelevantDocuments(topic)
  const context = docs.map((d) => `[Page ${d.metadata.page}]: ${d.pageContent}`).join('\n\n')

  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-1.5-pro',
    temperature: 0.3,
    apiKey: env.GOOGLE_API_KEY,
  })

  const chain = new LLMChain({ llm, prompt: REPORT_PROMPT })
  const result = await chain.call({ topic, context })

  return {
    markdown: result.text,
    sources: docs.map((d) => ({ page: d.metadata.page, chunk: d.pageContent.slice(0, 150) })),
  }
}

export async function exportReportAsPDF(markdown: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument()
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Parse markdown headings and render styled PDF
    const lines = markdown.split('\n')
    for (const line of lines) {
      if (line.startsWith('# ')) {
        doc.fontSize(18).font('Helvetica-Bold').text(line.slice(2), { paragraphGap: 8 })
      } else if (line.trim()) {
        doc.fontSize(11).font('Helvetica').text(line, { paragraphGap: 4 })
      }
    }
    doc.end()
  })
}
```

#### 4.2 Chapter Summarization (Map-Reduce)

```typescript
// src/services/summaryService.ts
import { loadSummarizationChain } from 'langchain/chains'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { PromptTemplate } from '@langchain/core/prompts'
import { Document } from 'langchain/document'
import { env } from '../config/env'

const MAP_PROMPT = PromptTemplate.fromTemplate(`
Summarize the following book excerpt concisely, preserving key facts and arguments:

"{text}"

CONCISE SUMMARY:
`)

const COMBINE_PROMPT = PromptTemplate.fromTemplate(`
You have been given a set of summaries from different sections of a book.
Combine them into a single, coherent, well-structured summary of the entire book.
Organize by themes, not by section order.

SUMMARIES:
{text}

UNIFIED BOOK SUMMARY:
`)

// Flash for map (cheap, fast) — Pro for combine (high quality)
const llmFlash = new ChatGoogleGenerativeAI({ model: 'gemini-1.5-flash', apiKey: env.GOOGLE_API_KEY })
const llmPro   = new ChatGoogleGenerativeAI({ model: 'gemini-1.5-pro',  apiKey: env.GOOGLE_API_KEY })

export async function summarizeBook(chunks: Document[]): Promise<string> {
  // Map step uses Flash, combine step uses Pro
  const mapChain = loadSummarizationChain(llmFlash, {
    type: 'map_reduce',
    mapPrompt: MAP_PROMPT,
    combinePrompt: COMBINE_PROMPT,
    combineLLM: llmPro,
    verbose: false,
  })

  const result = await mapChain.call({ input_documents: chunks })
  return result.text
}
```

#### 4.3 Quiz & Flashcard Generator

```typescript
// src/services/quizService.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { PromptTemplate } from '@langchain/core/prompts'
import { LLMChain } from 'langchain/chains'
import { getVectorStore } from './embedder'
import { z } from 'zod'
import { env } from '../config/env'

const QuizSchema = z.array(z.object({
  question:     z.string(),
  options:      z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correctIndex: z.number().min(0).max(3),
  page:         z.number(),
  explanation:  z.string(),
}))

const QUIZ_PROMPT = PromptTemplate.fromTemplate(`
Based on the following book content, generate {numQuestions} multiple-choice questions.

Rules:
- Each question must be unambiguous and have exactly one correct answer
- All 4 options must be plausible (not obviously wrong)
- Include the page number the question is derived from
- Include a brief explanation of why the correct answer is right

Respond with ONLY a valid JSON array. No markdown, no preamble.

Format:
[
  {{
    "question": "...",
    "options": ["A...", "B...", "C...", "D..."],
    "correctIndex": 0,
    "page": 12,
    "explanation": "..."
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
  const context = docs.map((d) => `[Page ${d.metadata.page}]: ${d.pageContent}`).join('\n\n')

  // Flash model — cheaper and fast enough for quiz generation
  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-1.5-flash',
    temperature: 0.4,
    apiKey: env.GOOGLE_API_KEY,
  })

  const chain = new LLMChain({ llm, prompt: QUIZ_PROMPT })
  const result = await chain.call({ context, numQuestions })

  // Strip any accidental markdown fences before parsing
  const cleaned = result.text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleaned)

  return QuizSchema.parse(parsed)  // validates structure with Zod
}
```

#### 4.4 Multi-book Querying

```typescript
// src/services/multiBookSearch.ts
import { getVectorStore } from './embedder'
import { Document } from 'langchain/document'

export async function searchAcrossBooks(
  query: string,
  namespaces: string[],
  kPerBook: number = 4
): Promise<Document[]> {
  const allResults: Array<Document & { score?: number }> = []

  // Query each namespace in parallel
  await Promise.all(
    namespaces.map(async (namespace) => {
      const vectorStore = await getVectorStore(namespace)
      const results = await vectorStore.similaritySearchWithScore(query, kPerBook)

      results.forEach(([doc, score]) => {
        allResults.push({ ...doc, score })
      })
    })
  )

  // Sort by relevance score and return top-K
  return allResults
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 8)
}
```

#### 4.5 LangChain.js Agent for Complex Tasks

```typescript
// src/services/agentService.ts
import { createOpenAIFunctionsAgent, AgentExecutor } from 'langchain/agents'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { DynamicTool } from '@langchain/core/tools'
import { buildQAChain } from './qaService'
import { generateReport } from './reportService'
import { generateQuiz } from './quizService'
import { env } from '../config/env'

export async function buildAgent(namespace: string) {
  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-1.5-pro',
    apiKey: env.GOOGLE_API_KEY,
    temperature: 0,
  })

  const qaChain = await buildQAChain(namespace)

  const tools = [
    new DynamicTool({
      name: 'SearchBook',
      description: 'Search the book for information on a specific topic. Input should be a question or topic string.',
      func: async (input: string) => {
        const result = await qaChain.invoke({ input })
        return result.answer
      },
    }),
    new DynamicTool({
      name: 'GenerateReport',
      description: 'Generate a structured report on a topic from the book. Input should be the topic name.',
      func: async (topic: string) => {
        const { markdown } = await generateReport(topic, namespace)
        return markdown
      },
    }),
    new DynamicTool({
      name: 'CreateQuiz',
      description: 'Generate quiz questions on a topic from the book. Input: "topic|numQuestions" e.g. "photosynthesis|5"',
      func: async (input: string) => {
        const [topic, num] = input.split('|')
        const questions = await generateQuiz(topic, namespace, parseInt(num ?? '5'))
        return JSON.stringify(questions)
      },
    }),
  ]

  // Note: Gemini doesn't support function calling the same way OpenAI does.
  // Use ReAct agent pattern which works with any chat model.
  const { createReactAgent } = await import('langchain/agents')
  const agent = await createReactAgent({ llm, tools })

  return new AgentExecutor({ agent, tools, verbose: false, maxIterations: 8 })
}
```

**Deliverable:** Reports, summaries, quizzes, multi-book search, and agent working end-to-end.

---

### Phase 5 — Frontend & UX

**Duration:** Week 6
**Goal:** Polished React + TypeScript frontend connected to all backend endpoints.

#### 5.1 Vite Config

```typescript
// apps/frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
```

#### 5.2 Zustand Stores (TypeScript)

```typescript
// src/store/useBooksStore.ts
import { create } from 'zustand'
import type { Book } from '@ebook-mafia/types'
import apiClient from '@/api/client'

interface BooksState {
  books: Book[]
  loading: boolean
  fetchBooks: () => Promise<void>
  addBook: (book: Book) => void
  updateBook: (id: string, updates: Partial<Book>) => void
}

export const useBooksStore = create<BooksState>((set, get) => ({
  books: [],
  loading: false,

  fetchBooks: async () => {
    set({ loading: true })
    try {
      const { data } = await apiClient.get<{ books: Book[] }>('/books')
      set({ books: data.books })
    } finally {
      set({ loading: false })
    }
  },

  addBook: (book) => set((state) => ({ books: [book, ...state.books] })),

  updateBook: (id, updates) => set((state) => ({
    books: state.books.map((b) => b.id === id ? { ...b, ...updates } : b)
  })),
}))
```

#### 5.3 File Uploader Component

```tsx
// src/components/FileUploader.tsx
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, Loader2 } from 'lucide-react'
import apiClient from '@/api/client'
import { useBooksStore } from '@/store/useBooksStore'

export function FileUploader() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const addBook = useBooksStore((s) => s.addBook)

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data } = await apiClient.post('/books/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
        }
      })

      // Poll for processing status
      pollStatus(data.bookId)
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
          <p>Uploading... {progress}%</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <UploadCloud className="h-10 w-10 text-gray-400" />
          <p className="text-gray-600">Drop your PDF here, or <span className="text-blue-500">browse</span></p>
          <p className="text-sm text-gray-400">Max 100MB</p>
        </div>
      )}
    </div>
  )
}

async function pollStatus(bookId: string) {
  const interval = setInterval(async () => {
    const { data } = await apiClient.get(`/books/${bookId}/status`)
    useBooksStore.getState().updateBook(bookId, {
      status: data.status,
      processingProgress: data.processingProgress,
    })
    if (data.status === 'ready' || data.status === 'failed') {
      clearInterval(interval)
    }
  }, 3000)
}
```

#### 5.4 Chat Interface

```tsx
// src/pages/books/BookChat.tsx
import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useChat } from '@/hooks/useChat'
import { PDFViewer } from '@/components/PDFViewer'
import { Send } from 'lucide-react'

export default function BookChat() {
  const { id: bookId } = useParams<{ id: string }>()
  const { answer, sources, sendMessage } = useChat(bookId!)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user'|'assistant', content: string }>>([])
  const [activePage, setActivePage] = useState(1)

  const handleSend = async () => {
    if (!input.trim()) return
    const q = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    await sendMessage(q)
    setMessages((prev) => [...prev, { role: 'assistant', content: answer }])
  }

  return (
    <div className="flex h-screen">
      {/* Left: PDF Viewer */}
      <div className="w-1/2 border-r">
        <PDFViewer bookId={bookId!} currentPage={activePage} />
      </div>

      {/* Right: Chat Panel */}
      <div className="w-1/2 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm
                ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Source citations — clickable to jump to page */}
          {sources.length > 0 && (
            <div className="text-xs text-gray-500 space-y-1">
              {sources.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActivePage(s.page)}
                  className="block text-left hover:text-blue-500 hover:underline"
                >
                  📄 Page {s.page}: {s.chunk.slice(0, 80)}...
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about this book..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleSend} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Deliverable:** Full frontend connected — upload, chat, reports, quiz, PDF viewer all working.

---

### Phase 6 — Production & Deployment

**Duration:** Week 7
**Goal:** Secure, scalable, production-ready deployment.

#### 6.1 Performance Optimizations

**Redis query caching:**
```typescript
// src/utils/cache.ts
import { Redis } from 'ioredis'
import { env } from '../config/env'

const redis = new Redis(env.REDIS_URL)

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached) as T

  const result = await fn()
  await redis.setex(key, ttlSeconds, JSON.stringify(result))
  return result
}

// Usage in chat router:
// const answer = await withCache(`qa:${namespace}:${hashQuery(query)}`, 3600, () => chain.invoke(...))
```

**BullMQ concurrency and rate limiting:**
```typescript
const worker = new Worker('pdf-ingestion', processor, {
  connection: { url: env.REDIS_URL },
  concurrency: 3,         // process 3 PDFs simultaneously
  limiter: {
    max: 10,              // max 10 Gemini embedding calls per
    duration: 1000,       // 1 second — respects Gemini rate limits
  }
})
```

#### 6.2 Security

Rate limiting with Hono middleware:
```typescript
import { rateLimiter } from 'hono-rate-limiter'

// Limit LLM-heavy endpoints
app.use('/api/chat/*', rateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  limit: 20,            // 20 chat requests per minute per user
  keyGenerator: (c) => c.get('userId'),
}))

app.use('/api/reports/*', rateLimiter({
  windowMs: 60 * 1000,
  limit: 5,             // 5 reports per minute (expensive)
  keyGenerator: (c) => c.get('userId'),
}))
```

Additional security measures:
- File validation — reject non-PDF MIME types before S3 upload
- Max file size enforced at route level (100MB)
- Pinecone namespace isolation — users can only access their own namespaces
- Input length limit on queries — prevent oversized Gemini prompts
- CORS restricted to known frontend origins

#### 6.3 Gemini Model Strategy (Cost Optimization)

| Task | Model | Reason |
|---|---|---|
| Q&A, Reports | `gemini-1.5-pro` | Best quality for user-facing answers |
| Quiz generation | `gemini-1.5-flash` | Simpler task, 10x cheaper |
| Summarization map step | `gemini-1.5-flash` | High volume, many small calls |
| Summarization combine step | `gemini-1.5-pro` | Final output quality matters |
| All embeddings | `text-embedding-004` | 768 dimensions, state-of-the-art |
| Cached queries | Redis | Avoid re-calling Gemini for same query |

#### 6.4 GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 8 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter backend typecheck
      - run: pnpm --filter backend build
      # Deploy to Railway via Railway CLI or webhook

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 8 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter frontend build
      # Vercel auto-deploys on push to main
```

#### 6.5 Deployment Stack

| Service | Platform | Notes |
|---|---|---|
| **Frontend** | Vercel | Auto-deploy from GitHub; set `VITE_*` env vars in Vercel dashboard |
| **Backend API** | Railway | Docker container; set all backend env vars in Railway |
| **BullMQ Worker** | Railway (separate service) | Same Docker image, different start command: `node dist/workers/pdfWorker.js` |
| **MongoDB** | MongoDB Atlas (M10+) | Enable connection pooling; allowlist Railway IPs |
| **Redis** | Upstash Redis | Serverless Redis; works with BullMQ via URL |
| **Vector DB** | Pinecone Serverless | Pay-per-query; free Starter tier for dev |
| **File Storage** | AWS S3 | Enable CloudFront CDN for PDF serving |
| **Auth** | Clerk | No hosting needed; fully managed |

#### 6.6 Monitoring

- **LangSmith** — trace every LangChain.js chain/agent call, measure latency and token usage
- **Sentry** — error tracking on both frontend (`@sentry/react`) and backend (`@sentry/node`)
- **BullMQ Dashboard** (`bull-board`) — monitor job queues, retry failed jobs
- **Upstash Redis** — built-in metrics dashboard
- **Vercel Analytics** — frontend performance and Web Vitals

**Deliverable:** Live production deployment, monitoring, CI/CD pipeline.

---

## 8. Key Implementation Notes

### Why Hono.js over Express?

Hono is built for the modern TypeScript era. It has first-class TypeScript support with typed context variables (no casting needed), runs on Bun/Deno/Node/Cloudflare Workers, has built-in SSE via `streamSSE`, and is significantly faster than Express. For a new TypeScript project in 2024+, Hono is the right call.

### Why BullMQ over Python Celery?

BullMQ is the TypeScript/Node.js equivalent of Celery — Redis-backed, reliable, supports retries, rate limiting, concurrency, and job progress. Since we're in a pure TypeScript environment, BullMQ eliminates the need for a Python worker process entirely.

### Why Clerk Instead of Custom JWT?

Building auth from scratch means: hashed passwords, refresh tokens, forgot password flows, OAuth integrations, CSRF protection, session management, and security audits. Clerk gives all of that in two environment variables. The backend only needs `@clerk/backend`'s `verifyToken()` — one function call. User IDs from Clerk are stable, unique, and safely scoped for Pinecone namespaces.

### Pinecone Namespacing Strategy

Every user+book combination gets its own Pinecone namespace: `user_<clerkId>_book_<mongoId>`. This provides hard isolation — a user can never accidentally retrieve another user's book chunks. Deleting a book means calling `index.namespace(namespace).deleteAll()` — clean and atomic.

### Chunking Best Practices

Never split mid-sentence — `RecursiveCharacterTextSplitter` handles this. Always store `page` and `bookId` in chunk metadata; these are essential for citation display and image retrieval. For tables and structured data, `pdfplumber` (Python) is better — but in a TypeScript stack, consider `pdfjs-dist`'s structured content API or pre-processing PDFs with a Python Lambda before ingestion if table quality matters.

### RAG Quality Tips

Use MMR (Maximal Marginal Relevance) retrieval to avoid repetitive chunks: `vectorStore.asRetriever({ searchType: 'mmr', k: 6 })`. For long books, Gemini 1.5 Pro's 1M token context window means you can sometimes skip chunking entirely for summarization — pass the whole book in one shot.

### Handling Large PDFs (500+ pages)

Always process ingestion asynchronously via BullMQ — never block the HTTP request. Poll `GET /books/:id/status` from the frontend every 3 seconds to update the progress bar. Use streaming (`streamSSE`) for all LLM responses so users see tokens instantly rather than waiting 15–30 seconds.

---

*Built with Hono.js · LangChain.js · Vite + React + TypeScript · Pinecone · MongoDB · Google Gemini · Clerk · BullMQ*