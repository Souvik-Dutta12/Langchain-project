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
export function pollBookStatus(
  bookId: string, 
  onUpdate: (progress: number, status: string) => void) {
  const interval = setInterval(async () => {
    try {
      const { data } = await apiClient.get<{
        status: string
        processingProgress: number
      }>(`/books/${bookId}/status`)

      console.log(data)
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