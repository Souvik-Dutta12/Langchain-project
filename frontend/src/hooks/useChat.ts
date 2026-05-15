import { useState, useCallback, useRef } from 'react'
import type { Source } from '../../../packages/types/src' 

export function useChat(bookIds: string[]) {
  const [streamingAnswer, setStreamingAnswer] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const conversationIdRef = useRef<string | null>(null)

  const sendMessage = useCallback(
    async (
      query: string
    ): Promise<{ answer: string; sources: Source[] }> => {
      
      if (bookIds.length === 0) throw new Error('Select at least one book first')
      
      setStreamingAnswer('')
      setSources([])
      setIsStreaming(true)
      setError(null)

      let fullAnswer = ''
      let resolvedSources: Source[] = []

      return new Promise(async (resolve, reject) => {
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
        url.searchParams.set('bookIds', bookIds.join(','))
        url.searchParams.set('token', token)
        if (conversationIdRef.current) {
          url.searchParams.set('conversationId', conversationIdRef.current)
        }

        console.log("FINAL STREAM URL:", url.toString())
        
        const es = new EventSource(url.toString())

        es.addEventListener('conversationId', (e) => {
          conversationIdRef.current = e.data
        })

        es.addEventListener('token', (e) => {
          const chunk = e.data.replace(/\\n/g, '\n')
          fullAnswer += chunk
          setStreamingAnswer((prev) => prev + chunk)
        })

        es.addEventListener('sources', (e) => {
          const parsedSources = JSON.parse(e.data) as Source[]
          resolvedSources = parsedSources
          setSources(parsedSources)
        })

        es.addEventListener('done', () => {
          es.close()
          setIsStreaming(false)
          resolve({ 
            answer: fullAnswer, 
            sources: resolvedSources 
          })
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
    [bookIds]
  )
  const resetConversation = useCallback(() => {
    conversationIdRef.current = null
    setStreamingAnswer('')
    setSources([])
    setError(null)
  }, [])

  return { 
    streamingAnswer, 
    sources, 
    isStreaming, 
    error, 
    sendMessage,
    resetConversation,
    conversationId: conversationIdRef.current
  }
}