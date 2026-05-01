import { create } from 'zustand'
import type { Book } from '../../../packages/types/src'
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