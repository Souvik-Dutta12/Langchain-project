# 📚 Ebook Mafia — Full Project Plan (Updated)

> An intelligent PDF/Ebook platform where users can upload large books and interact with them through Q&A, report generation, summarization, quiz creation, and more — powered by LangChain and modern AI infrastructure.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Features](#core-features)
3. [Tech Stack](#tech-stack)
4. [Architecture Overview](#architecture-overview)
5. [Phase-wise Implementation](#phase-wise-implementation)
   - [Phase 1 — Foundation & Setup](#phase-1--foundation--setup)
   - [Phase 2 — PDF Ingestion Pipeline](#phase-2--pdf-ingestion-pipeline)
   - [Phase 3 — Semantic Search & Q&A Engine](#phase-3--semantic-search--qa-engine)
   - [Phase 4 — Advanced Features](#phase-4--advanced-features)
   - [Phase 5 — Frontend & UX](#phase-5--frontend--ux)
   - [Phase 6 — Production & Deployment](#phase-6--production--deployment)
6. [Folder Structure](#folder-structure)
7. [Key Implementation Notes](#key-implementation-notes)

---

## Project Overview

**Ebook Mafia** is an AI-powered ebook companion that allows users to:

- Upload any large PDF (textbooks, research papers, novels, manuals)
- Ask natural language questions and get grounded answers from the book
- Generate structured reports on any topic present in the book
- Create Q&A sets, quizzes, flashcards, and summaries
- Extract images from books and include them in generated reports
- Use it as a study assistant, research helper, or knowledge base

---

## Core Features

| Feature | Description |
|---|---|
| **PDF Upload** | Support large files (100MB+), multi-PDF per user |
| **Q&A Chat** | Conversational Q&A grounded in the book's content |
| **Report Generation** | Generate structured reports on any topic from the book |
| **Summarization** | Chapter-wise or full book summaries |
| **Quiz / Flashcard Generator** | Auto-generate MCQs, fill-in-the-blanks, flashcards |
| **Image Extraction** | Pull images from PDFs and embed them in reports |
| **Citation with Page Numbers** | Every answer cites the exact page |
| **Multi-book Chat** | Query across multiple uploaded books |
| **Export** | Download reports as PDF/DOCX |

---

## Tech Stack

### Backend

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | FastAPI | REST API server |
| **AI Orchestration** | LangChain | Chains, agents, memory |
| **LLM** | Google Gemini 1.5 Pro / Flash | Generation & reasoning |
| **Embeddings** | Gemini `text-embedding-004` | Semantic vector encoding |
| **Vector Store** | Pinecone (Serverless) | Semantic search |
| **PDF Parsing** | PyMuPDF (`fitz`) + pdfplumber | Text + image extraction |
| **Document Chunking** | LangChain RecursiveCharacterTextSplitter | Smart chunking |
| **File Storage** | Local → AWS S3 / Cloudflare R2 | Raw PDF storage |
| **Database** | MongoDB (via Motor / MongoEngine) | User data, book metadata |
| **Cache** | Redis | Query caching, session store |
| **Task Queue** | Celery + Redis | Async PDF processing |
| **Report Export** | ReportLab / python-docx | PDF/DOCX generation |
| **Auth** | JWT + OAuth2 | User authentication |

### Frontend

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Vite + React + TypeScript (TSX) | Fast SPA frontend |
| **UI Library** | shadcn/ui + Tailwind CSS | Component library |
| **PDF Viewer** | react-pdf | In-browser PDF display |
| **Chat UI** | Custom streaming component | Real-time chat interface |
| **State Management** | Zustand | Client-side state |
| **File Upload** | react-dropzone | Drag-and-drop uploader |
| **Routing** | React Router v6 | Client-side routing |

### Infrastructure

| Tool | Purpose |
|---|---|
| Docker + Docker Compose | Local dev containerization |
| AWS EC2 / Railway | Backend hosting |
| Vercel | Frontend hosting |
| Pinecone | Managed vector DB |
| AWS S3 | PDF file storage |
| MongoDB Atlas | Managed MongoDB (production) |
| GitHub Actions | CI/CD pipeline |

---

## Architecture Overview

```
User
  │
  ▼
[Vite + React + TSX Frontend]
  │
  ├──── Upload PDF ──────────────────────────────────────────────────────┐
  │                                                                       │
  ▼                                                                       ▼
[FastAPI Backend]                                              [Celery Worker]
  │                                                               │
  │  Q&A / Report / Quiz Request                    ┌────────────┴──────────────┐
  │                                                 │   PDF Ingestion Pipeline  │
  ▼                                                 │                           │
[LangChain Chain Layer]                             │  1. PyMuPDF  → Extract    │
  │                                                 │     text + images         │
  ├── Retriever (Semantic Search)                   │  2. Chunking (LangChain)  │
  │        │                                        │  3. Gemini Embed → Pinecone│
  │        ▼                                        │  4. Save metadata to MongoDB│
  │   [Pinecone Serverless]                         └───────────────────────────┘
  │
  ├── LLM (Gemini 1.5 Pro / Flash)
  │
  └── Response with Citations → Frontend
```

---

## Phase-wise Implementation

---

### Phase 1 — Foundation & Setup

**Duration:** Week 1  
**Goal:** Project scaffolding, environment setup, core dependencies installed and working.

#### 1.1 Repository & Environment Setup

```bash
# Backend setup
mkdir ebook-mafia && cd ebook-mafia
python -m venv venv && source venv/bin/activate

pip install fastapi uvicorn langchain langchain-google-genai \
  langchain-community langchain-pinecone pinecone-client \
  pymupdf pdfplumber python-multipart motor mongoengine \
  celery redis python-jose passlib python-dotenv reportlab python-docx

# Frontend setup
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
npm install react-router-dom zustand react-dropzone react-pdf \
  tailwindcss @tailwindcss/vite lucide-react axios
```

#### 1.2 Environment Variables

```env
# .env

# Google Gemini
GOOGLE_API_KEY=your-gemini-api-key-here

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=ebook-mafia
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1

# MongoDB
MONGODB_URL=mongodb://localhost:27017/ebookmafia
# Production: MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/ebookmafia

# Redis / Celery
REDIS_URL=redis://redis:6379/0

# AWS S3
AWS_BUCKET_NAME=ebook-mafia-pdfs
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# Security
SECRET_KEY=your-super-secret-jwt-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

#### 1.3 FastAPI App Skeleton

- Set up project with routers: `/auth`, `/books`, `/chat`, `/reports`
- Configure CORS, middleware, and error handlers
- Set up MongoDB with Motor (async) for: `users`, `books`, `conversations`, `messages` collections
- Configure Celery with Redis as broker

#### 1.4 MongoDB Models (MongoEngine / Motor)

```python
# Using Motor (async MongoDB driver) with Pydantic
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from bson import ObjectId
from datetime import datetime

# Collections: users, books, conversations, messages
# No migrations needed — MongoDB is schema-flexible

class UserDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    email: str
    username: str
    hashed_password: str
    is_active: bool = True
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BookDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    title: str
    author: str = ""
    owner_id: str                   # references users.id
    s3_key: str = ""
    s3_url: str = ""
    file_size: int = 0
    page_count: int = 0
    is_indexed: bool = False        # Pinecone indexed?
    processing_progress: int = 0    # 0–100%
    pinecone_namespace: str = ""    # user_{id}_book_{id}
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

#### 1.5 Docker Compose Setup

```yaml
# docker-compose.yml services:
# - api (FastAPI)
# - worker (Celery)
# - mongodb
# - redis
# - (Pinecone is external SaaS — no container needed)
```

**Deliverable:** Running FastAPI server with MongoDB, Redis, and Celery connected.

---

### Phase 2 — PDF Ingestion Pipeline

**Duration:** Week 2  
**Goal:** Upload a PDF → extract text + images → chunk → embed with Gemini → store in Pinecone.

#### 2.1 PDF Upload Endpoint

```python
# POST /books/upload
# - Accept multipart PDF
# - Save to S3 / local storage
# - Save metadata to MongoDB (filename, size, upload time, user_id)
# - Trigger Celery task for async processing
```

#### 2.2 Text Extraction (PyMuPDF)

```python
import fitz  # PyMuPDF

def extract_text_with_pages(pdf_path: str) -> list[dict]:
    doc = fitz.open(pdf_path)
    pages = []
    for page_num, page in enumerate(doc):
        pages.append({
            "page": page_num + 1,
            "text": page.get_text("text"),
            "blocks": page.get_text("dict")["blocks"]
        })
    return pages
```

**Key Detail:** Store page number with every chunk — this is critical for citations.

#### 2.3 Image Extraction

```python
def extract_images(pdf_path: str, output_dir: str) -> list[dict]:
    doc = fitz.open(pdf_path)
    images = []
    for page_num, page in enumerate(doc):
        for img_index, img in enumerate(page.get_images(full=True)):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            ext = base_image["ext"]
            img_path = f"{output_dir}/page{page_num+1}_img{img_index}.{ext}"
            with open(img_path, "wb") as f:
                f.write(image_bytes)
            images.append({
                "page": page_num + 1,
                "path": img_path,
                "caption": ""  # optionally use Gemini Vision to generate caption
            })
    return images
```

#### 2.4 Chunking Strategy

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,         # tokens approx.
    chunk_overlap=150,      # overlap to avoid context loss at boundaries
    separators=["\n\n", "\n", ". ", " ", ""]
)

# Each chunk carries metadata:
# { "text": "...", "page": 12, "book_id": "abc", "chunk_id": "abc-12-3" }
```

> **Why 800 tokens with 150 overlap?** — Balances retrieval precision and context richness. Too small = loses context. Too large = noise in retrieval.

#### 2.5 Gemini Embeddings + Pinecone

```python
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

# Initialize Pinecone
pc = Pinecone(api_key=settings.pinecone_api_key)

# Create index (run once)
if settings.pinecone_index_name not in pc.list_indexes().names():
    pc.create_index(
        name=settings.pinecone_index_name,
        dimension=768,              # Gemini text-embedding-004 output dimension
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )

# Gemini embeddings
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004",
    google_api_key=settings.google_api_key
)

# Each user+book gets its own namespace → isolation
namespace = f"user_{user_id}_book_{book_id}"

vectorstore = PineconeVectorStore.from_documents(
    documents=chunks,
    embedding=embeddings,
    index_name=settings.pinecone_index_name,
    namespace=namespace
)
```

#### 2.6 Celery Task Flow

```
[Upload API] → save PDF to S3 → save metadata to MongoDB → enqueue Celery task
[Celery Worker] → extract text → extract images → chunk → embed (Gemini) → upsert to Pinecone
[MongoDB] → update book.status: "processing" → "ready", update book.processing_progress 0→100
[Frontend] → polls GET /books/{id}/status → shows progress bar
```

**Deliverable:** Upload a PDF → ingestion pipeline runs → book marked "ready" in MongoDB.

---

### Phase 3 — Semantic Search & Q&A Engine

**Duration:** Week 3  
**Goal:** User asks a question → retrieve relevant chunks from Pinecone → Gemini answers with citations.

#### 3.1 Retrieval Chain (Core RAG with Gemini)

```python
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-pro",
    temperature=0.2,
    google_api_key=settings.google_api_key
)

prompt = PromptTemplate(
    input_variables=["context", "question"],
    template="""
You are an intelligent assistant helping users understand an ebook.
Use ONLY the context below to answer the question.
Always cite the page number(s) from which you derived your answer.
If the answer is not in the context, say "This information is not available in the book."

Context:
{context}

Question: {question}

Answer (with page citations):
"""
)

# Load vectorstore from existing Pinecone index
vectorstore = PineconeVectorStore(
    index_name=settings.pinecone_index_name,
    embedding=embeddings,
    namespace=f"user_{user_id}_book_{book_id}"
)

qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=vectorstore.as_retriever(search_kwargs={"k": 6}),
    chain_type_kwargs={"prompt": prompt},
    return_source_documents=True
)
```

#### 3.2 Conversational Memory (Multi-turn Chat)

```python
from langchain.memory import ConversationBufferWindowMemory
from langchain.chains import ConversationalRetrievalChain

memory = ConversationBufferWindowMemory(
    memory_key="chat_history",
    return_messages=True,
    k=10  # last 10 exchanges
)

conversational_chain = ConversationalRetrievalChain.from_llm(
    llm=llm,
    retriever=vectorstore.as_retriever(search_kwargs={"k": 6}),
    memory=memory,
    return_source_documents=True
)
```

#### 3.3 Streaming Responses

```python
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from fastapi.responses import StreamingResponse

# Gemini supports streaming via LangChain's streaming interface
# Stream tokens via Server-Sent Events (SSE) to the frontend
llm_stream = ChatGoogleGenerativeAI(
    model="gemini-1.5-pro",
    streaming=True,
    callbacks=[StreamingStdOutCallbackHandler()]
)
```

#### 3.4 Source Document Response Format

Every API response includes:

```json
{
  "answer": "The mitochondria is the powerhouse of the cell...",
  "sources": [
    { "page": 34, "chunk": "...relevant text snippet..." },
    { "page": 35, "chunk": "...another relevant snippet..." }
  ],
  "confidence": "high"
}
```

#### 3.5 Save Messages to MongoDB

```python
# Conversations and messages stored in MongoDB
# conversation document:
{
  "_id": ObjectId,
  "user_id": "...",
  "book_id": "...",
  "title": "New Conversation",
  "created_at": ISODate
}

# message document:
{
  "_id": ObjectId,
  "conversation_id": "...",
  "role": "user" | "assistant",
  "content": "...",
  "sources": [...],     # page citations
  "tokens_used": 423,
  "created_at": ISODate
}
```

**Deliverable:** Working `/chat` endpoint with streaming, memory, and page citations.

---

### Phase 4 — Advanced Features

**Duration:** Weeks 4–5  
**Goal:** Reports, summaries, quizzes, image inclusion, multi-book support.

#### 4.1 Report Generation

**Flow:**

```
User: "Generate a report on photosynthesis from this book"
  ↓
1. Query Pinecone for all chunks related to "photosynthesis"
2. Retrieve related images from MongoDB book_images collection (by page proximity)
3. Gemini structures a report: Introduction → Key Concepts → Details → Conclusion
4. Images inserted at relevant sections
5. Export as PDF (ReportLab) or DOCX (python-docx)
```

```python
REPORT_PROMPT = """
You are a report writer. Based ONLY on the following book excerpts, 
write a detailed, well-structured report on the topic: {topic}.

Structure:
1. Introduction
2. Key Concepts
3. Detailed Explanation
4. Examples or Case Studies (if present in the text)
5. Conclusion
6. Page References

Book Excerpts:
{context}
"""
```

#### 4.2 Chapter Summarization

```python
# Map-Reduce summarization for long books using Gemini
from langchain.chains.summarize import load_summarize_chain

# Use Gemini Flash for cheaper map step, Pro for combine step
llm_flash = ChatGoogleGenerativeAI(model="gemini-1.5-flash")
llm_pro   = ChatGoogleGenerativeAI(model="gemini-1.5-pro")

chain = load_summarize_chain(
    llm_flash,
    chain_type="map_reduce",   # works well for large books
    verbose=True
)
# map_prompt: summarize each chunk (Gemini Flash — fast and cheap)
# combine_prompt: combine summaries (Gemini Pro — high quality)
```

#### 4.3 Quiz & Flashcard Generator

```python
QUIZ_PROMPT = """
Based on the following book content, generate {num_questions} multiple-choice questions.
Each question must have:
- A clear question
- 4 options (A, B, C, D)
- The correct answer
- The page number it was derived from

Format as JSON array.

Content:
{context}
"""
```

Supported quiz types:
- Multiple Choice Questions (MCQ)
- True/False
- Fill in the blanks
- Short answer
- Flashcards (term + definition)

#### 4.4 Image-Aware Report Generation

```python
# Image metadata stored in MongoDB (no separate SQL table needed)
# MongoDB collection: book_images

# Document schema:
{
  "_id": ObjectId,
  "book_id": "...",
  "page_number": 12,
  "s3_key": "images/book123/page12_img0.png",
  "caption": "...",      # Gemini Vision generated
  "width": 800,
  "height": 600,
  "created_at": ISODate
}

# Query: find images near cited pages
images = await db.book_images.find({
    "book_id": book_id,
    "page_number": {"$in": cited_pages}
}).to_list()
```

#### 4.5 Multi-book Querying

```python
# Allow retrieval across multiple books using Pinecone namespaces
# Pinecone doesn't support multi-namespace query in one call,
# so we query each namespace and merge + rerank results

results = []
for book_id in selected_book_ids:
    namespace = f"user_{user_id}_book_{book_id}"
    r = vectorstore.similarity_search(query, k=4, namespace=namespace)
    results.extend(r)

# Sort by relevance score and take top-k
results = sorted(results, key=lambda x: x.metadata.get("score", 0), reverse=True)[:8]
```

#### 4.6 LangChain Agent for Complex Tasks

For complex requests like *"Compare Chapter 3 and Chapter 7 on the topic of evolution"*, use a LangChain agent with custom tools:

```python
from langchain.agents import Tool, initialize_agent

tools = [
    Tool(name="SearchBook",     func=qa_chain.run,        description="Search the book for information"),
    Tool(name="GetChapter",     func=get_chapter_text,    description="Get full text of a chapter"),
    Tool(name="GenerateReport", func=generate_report,     description="Write a structured report"),
    Tool(name="CreateQuiz",     func=generate_quiz,       description="Generate quiz questions"),
]

agent = initialize_agent(
    tools, llm,
    agent="zero-shot-react-description",
    verbose=True
)
```

**Deliverable:** Reports, summaries, quizzes, and agent-based complex task handling working end-to-end.

---

### Phase 5 — Frontend & UX

**Duration:** Week 6  
**Goal:** Polished, intuitive Vite + React + TypeScript frontend connecting to all backend APIs.

#### 5.1 Vite Project Setup

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend

# Install all dependencies
npm install react-router-dom zustand axios react-dropzone react-pdf
npm install -D tailwindcss @tailwindcss/vite
npm install lucide-react @radix-ui/react-dialog @radix-ui/react-tabs

# shadcn/ui setup
npx shadcn-ui@latest init
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000'   // proxy to FastAPI
    }
  }
})
```

#### 5.2 Pages & Routes (React Router v6)

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                      element={<Landing />} />
        <Route path="/auth/login"            element={<Login />} />
        <Route path="/auth/register"         element={<Register />} />
        <Route path="/dashboard"             element={<Dashboard />} />
        <Route path="/books/:id"             element={<BookChat />} />
        <Route path="/books/:id/report"      element={<ReportBuilder />} />
        <Route path="/books/:id/quiz"        element={<QuizView />} />
        <Route path="/books/:id/summary"     element={<Summary />} />
      </Routes>
    </BrowserRouter>
  )
}
```

#### 5.3 Zustand State Management

```typescript
// src/store/useAuthStore.ts
import { create } from 'zustand'

interface AuthStore {
  token: string | null
  user: User | null
  setToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: localStorage.getItem('token'),
  user: null,
  setToken: (token) => {
    localStorage.setItem('token', token)
    set({ token })
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null })
  }
}))
```

#### 5.4 Key UI Components

- **PDF Uploader** — Drag-and-drop with progress bar and processing status polling
- **Chat Interface** — Split view: PDF viewer (left) + chat panel (right), streaming tokens
- **Page Jump** — Clicking a citation jumps to that page in the PDF viewer
- **Report Builder** — Topic input → "Generate Report" → preview → download button
- **Quiz UI** — Interactive MCQ quiz with scoring and answer reveal
- **Book Library** — Card grid with book thumbnail, upload date, and quick actions

#### 5.5 Streaming Chat (SSE)

```typescript
// src/hooks/useChat.ts
export function useChat(bookId: string) {
  const [answer, setAnswer] = useState('')
  const { token } = useAuthStore()

  const sendMessage = async (query: string) => {
    setAnswer('')
    const eventSource = new EventSource(
      `/api/chat/stream?query=${encodeURIComponent(query)}&book_id=${bookId}&token=${token}`
    )
    eventSource.onmessage = (e) => {
      setAnswer(prev => prev + e.data)
    }
    eventSource.onerror = () => eventSource.close()
  }

  return { answer, sendMessage }
}
```

**Deliverable:** Fully connected Vite + React + TSX frontend with chat, report generation, quiz, and PDF viewer.

---

### Phase 6 — Production & Deployment

**Duration:** Week 7  
**Goal:** Secure, scalable, production-ready deployment.

#### 6.1 Performance Optimizations

- **Query caching** — Cache frequent Pinecone queries in Redis (TTL: 1 hour)
- **Batch embedding** — Process chunks in parallel with Gemini during ingestion
- **Async MongoDB** — All DB operations via Motor (fully async)
- **Async endpoints** — All heavy operations are async or Celery-delegated
- **Pagination** — Paginate chat history and source documents

#### 6.2 Security

- JWT-based authentication with refresh tokens
- Rate limiting on `/chat` and `/reports` endpoints (prevent LLM abuse)
- File validation — only accept valid PDFs, max size limit
- Per-user Pinecone namespace isolation (users can't access each other's books)
- Input sanitization to prevent prompt injection

#### 6.3 Gemini Model Strategy (Cost Optimization)

```python
# Use different Gemini models based on task complexity

# Gemini Flash — fast, cheap → quiz generation, summarization map step
llm_flash = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.3)

# Gemini Pro — high quality → Q&A, reports, complex reasoning
llm_pro = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0.2)

# Gemini text-embedding-004 → all embeddings (768 dimensions)
embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
```

#### 6.4 Deployment Stack

```
Frontend  → Vercel (auto-deploy from GitHub, Vite build)
Backend   → Railway or AWS EC2 (Docker container)
DB        → MongoDB Atlas (M10 cluster or higher for production)
Redis     → Upstash Redis
Vector DB → Pinecone Serverless (pay-per-use)
Storage   → AWS S3 + CloudFront CDN
```

#### 6.5 Monitoring

- **LangSmith** — LangChain observability, trace every chain call
- **Sentry** — Error tracking (frontend + backend)
- **Prometheus + Grafana** — API metrics (latency, throughput, errors)

**Deliverable:** Live production deployment with monitoring.

---

## Folder Structure

```
ebook-mafia/
│
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entry point
│   │   ├── core/
│   │   │   ├── config.py           # Settings / env vars (Pydantic)
│   │   │   ├── database.py         # Motor async MongoDB client
│   │   │   ├── security.py         # JWT + bcrypt
│   │   │   └── celery_app.py       # Celery + Redis
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── books.py
│   │   │   ├── chat.py
│   │   │   └── reports.py
│   │   ├── services/
│   │   │   ├── pdf_ingestion.py    # Text + image extraction (PyMuPDF)
│   │   │   ├── chunker.py          # LangChain text splitting
│   │   │   ├── embedder.py         # Gemini embeddings + Pinecone upsert
│   │   │   ├── qa_service.py       # RAG chain (Gemini Pro + Pinecone)
│   │   │   ├── report_service.py   # Report generation
│   │   │   └── quiz_service.py     # Quiz generation (Gemini Flash)
│   │   ├── models/
│   │   │   └── mongo_models.py     # Pydantic models for MongoDB collections
│   │   ├── tasks/
│   │   │   └── celery_tasks.py     # Async ingestion tasks
│   │   └── utils/
│   │       └── file_utils.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                        # Vite + React + TypeScript
│   ├── src/
│   │   ├── App.tsx                  # Router + layout
│   │   ├── main.tsx                 # Vite entry point
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── books/
│   │   │       ├── BookChat.tsx     # Chat interface
│   │   │       ├── ReportBuilder.tsx
│   │   │       ├── QuizView.tsx
│   │   │       └── Summary.tsx
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── PDFViewer.tsx
│   │   │   ├── FileUploader.tsx
│   │   │   └── QuizUI.tsx
│   │   ├── store/
│   │   │   ├── useAuthStore.ts      # Zustand auth state
│   │   │   └── useBooksStore.ts     # Zustand books state
│   │   ├── hooks/
│   │   │   ├── useChat.ts           # SSE streaming hook
│   │   │   └── useBooks.ts
│   │   ├── api/
│   │   │   └── client.ts            # Axios instance + interceptors
│   │   └── types/
│   │       └── index.ts             # Shared TypeScript types
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Docker Compose (Updated)

```yaml
version: "3.9"

services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    env_file: .env
    depends_on: [mongodb, redis]
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  worker:
    build: ./backend
    env_file: .env
    depends_on: [mongodb, redis]
    command: celery -A app.core.celery_app.celery_app worker --loglevel=info

  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongo_data:/data/db]
    environment:
      MONGO_INITDB_DATABASE: ebookmafia

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  # Note: Pinecone is a cloud service — no local container needed
  # Use Pinecone's free Starter plan for development

volumes:
  mongo_data:
```

---

## Key Implementation Notes

### Why MongoDB over PostgreSQL?

- **Schema flexibility** — book metadata, image metadata, and message sources have variable structure
- **No migrations** — add fields to documents without ALTER TABLE
- **Native JSON** — LLM outputs (quiz JSON, source citations) store natively
- **Motor** — fully async driver, pairs perfectly with FastAPI's async model
- **Atlas** — managed cloud service, easy scaling without DBA overhead

### Why Pinecone over ChromaDB?

- **Serverless** — no infrastructure to manage; pay only for queries
- **Namespaces** — built-in user/book isolation without separate collections
- **Scale** — handles millions of vectors without tuning
- **Managed** — automatic replication, backups, and updates

### Why Gemini over OpenAI?

- **Gemini 1.5 Pro** — 1M token context window (can handle entire books in one call)
- **Gemini Flash** — much cheaper for high-volume tasks (quiz, summarization)
- **text-embedding-004** — state-of-the-art embeddings, 768 dimensions
- **Multimodal** — Gemini Vision can caption extracted PDF images natively
- **LangChain support** — `langchain-google-genai` package is first-class

### Why Vite + TSX over Next.js?

- **Faster dev server** — Vite HMR is near-instant vs Next.js
- **Simpler setup** — SPA model fits this app; no SSR needed
- **TypeScript first** — `react-ts` template gives full TSX support out of the box
- **Smaller bundle** — no Next.js framework overhead

### Chunking Best Practices

- Never split mid-sentence — use `RecursiveCharacterTextSplitter`
- Always store `page_number` and `book_id` in chunk metadata
- For tables and structured data, use `pdfplumber` instead of PyMuPDF
- For scanned PDFs (images of text), add OCR fallback using `pytesseract`

### RAG Quality Tips

- Use **MMR (Maximal Marginal Relevance)** retrieval to avoid repetitive chunks
- Add a **reranker** (Cohere Rerank API) for higher relevance scoring
- For long books, leverage **Gemini 1.5 Pro's 1M context window** directly for summarization instead of chunking

### Cost Management

- Use **Gemini Flash** for quiz/flashcard generation (simpler task, much cheaper)
- Use **Gemini Pro** only for final report generation and complex Q&A
- Cache identical Pinecone queries in Redis (TTL: 1 hour)
- Use **Pinecone Starter** (free tier) during development

### Handling Large PDFs (500+ pages)

- Always process ingestion **asynchronously** (Celery)
- Update `processing_progress` field in MongoDB for live progress bar
- Use streaming for LLM responses (users shouldn't wait 30s)
- Limit retrieval to top-6 most relevant Pinecone chunks (not entire book)

---

*Built with LangChain · FastAPI · Vite + React + TypeScript · Pinecone · MongoDB · Google Gemini*