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