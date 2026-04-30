import { Hono } from 'hono'
import type { AppVariables } from '../types/hono.js' 
import { BookModel } from '../models/book.js'

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
