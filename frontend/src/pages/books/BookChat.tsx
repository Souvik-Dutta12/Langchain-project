import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useChat } from '@/hooks/useChat'
import { PDFViewer } from '@/main_components/PDFViewer'
import { useBooksStore } from '@/store/useBooksStore'
import { Send, Loader2, ArrowLeft, FileText, HelpCircle, BookOpen } from 'lucide-react'
import type { Source } from '../../../../packages/types/src'

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