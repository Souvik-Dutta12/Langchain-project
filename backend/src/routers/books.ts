import { Hono } from 'hono'
import type { AppVariables } from '../types/hono.js'
import { BookModel } from '../models/book.js'
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { env } from '../config/env.js'
import { Queue } from 'bullmq'
import { pinecone } from '../config/pinecone.js'


const router = new Hono<{ Variables: AppVariables }>()

// Cloudflare R2 client — S3-compatible
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudfarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY
  },
})

const ingestionQueue = new Queue('pdf-ingestion', {
  connection: {
    url: env.REDIS_URL
  }
})


// GET /api/books — list user's books
router.get('/', async (c) => {
  const userId = c.get('userId')  // typed, guaranteed to exist past middleware

  const books = await BookModel.find({ ownerClerkId: userId })
    .sort({ createdAt: -1 })
    .lean()

  return c.json({ books })
})

// POST /api/books/upload — upload PDF → R2 → enqueue ingestion job
router.post('/upload', async (c) => {
  const userId = c.get('userId')
  const formData = await c.req.formData()
  const file = formData.get('file') as File

  if (!file || !file.name.endsWith('.pdf')) {
    return c.json({ error: 'Only PDF files are accepted' }, 400)
  }

  if (file.size > 100 * 1024 * 1024) {
    return c.json({ error: 'File too large (max 100MB)' }, 413)
  }

  // create book doc in mongodb firest
  const book = await BookModel.create({
    title: file.name.replace(/\.pdf$/i, '').replace(/_/g, ' '),
    ownerClerkId: userId,
    fileSize: file.size,
    status: 'pending'
  })

  const r2Key = `pdfs/${userId}/${book.id}.pdf`
  const namespace = `user_${userId}_book_${book.id}`

  //uploas to cloudfare
  const buffer = Buffer.from(await file.arrayBuffer())
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: r2Key,
      Body: buffer,
      ContentType: 'application/pdf',
    })
  )

  //update book with r2 info
  book.r2Key = r2Key
  book.r2Url = `${env.R2_PUBLIC_URL}/${r2Key}`
  book.pineconeNamespace = namespace
  await book.save()

  //enqueue BullMq job
  await ingestionQueue.add(
    'ingest-pdf',
    {
      bookId: book.id,
      r2Key,
      userId,
      namespace
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 30_000
      }
    }
  )

  return c.json(
    {
      bookId: book.id,
      status: 'processing',
      message: "PDF is being processed"
    },
    202
  )

})

// GET /api/books/:id/status — poll processing status
router.get('/:id/status', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()

  const book = await BookModel.findOne({
    _id: id,
    ownerClerkId: userId
  }).lean()

  if (!book) return c.json({ error: "Book not found" }, 404)
  return c.json({
    status: book.status,
    processingProgress: book.processingProgress,
    pageCount: book.pageCount
  })

})

// GET /api/books/:id — get single book
router.get('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()

  const book = await BookModel.findOne({
    _id: id,
    ownerClerkId: userId
  }).lean()
  if (!book) return c.json({ error: 'Book not found' }, 404)

  return c.json({
    book
  })
})

// DELETE /api/books/:id — delete book + R2 file + Pinecone namespace
router.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()

  const book = await BookModel.findOne({
    _id: id,
    ownerClerkId: userId
  })
  if (!book) return c.json({ error: 'Book not found' }, 404)

  // Delete from R2
  if (book.r2Key) {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: book.r2Key
      })
    )
  }

  // Delete from Pinecone namespace
  if (book.pineconeNamespace) {
    const index = pinecone.index(env.PINECONE_INDEX_NAME)
    await index.namespace(book.pineconeNamespace).deleteAll()
  }

  await book.deleteOne()

  return c.json({
    success: true
  })
})


export default router
