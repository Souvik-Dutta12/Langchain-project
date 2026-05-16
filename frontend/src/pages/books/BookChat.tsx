import { useState, useRef, useEffect, useCallback } from 'react'
import { useChat } from '@/hooks/useChat'
import { useBooksStore } from '@/store/useBooksStore'
import { useChatStore } from '@/store/useChatStore'
import { Send, Loader2, FileText, X, BookOpen, Sparkles } from 'lucide-react'
import type { Source, ChatMessage } from '../../../../packages/types/src'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { nanoid } from 'nanoid'
import { useUser } from '@clerk/clerk-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import ReactMarkdown from "react-markdown";
interface SelectedBook {
  id: string
  title: string
}

export default function BookChat() {
  const { user } = useUser()
  const books = useBooksStore((s) => s.books)

  const [selectedBooks, setSelectedBooks] = useState<SelectedBook[]>([])

  // ── Pass all selected book IDs to the hook (was single activeBookId) ──
  const bookIds = selectedBooks.map((b) => b.id)
  const { streamingAnswer, sources, isStreaming, sendMessage } = useChat(bookIds)

  // ── Persist messages in store instead of local state ─────────────────
  const { activeConversationId,setActiveConversation, startConversation, addMessage, conversations } = useChatStore()
  const activeMessages = activeConversationId
    ? (conversations[activeConversationId]?.messages ?? [])
    : []

  // Map store messages to local Message shape for rendering (no UI change)
  const messages: ChatMessage[] = activeMessages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    sources: m.sources,
    contextBooksIds: m.contextBookIds
      ?.map((id) => books.find((b) => b._id === id)?.title)
      .filter(Boolean) as string[],
    createdAt: m.createdAt
  }))

  const [input, setInput] = useState('')

  // @ mention state
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionMenuIndex, setMentionMenuIndex] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mentionStartRef = useRef<number>(-1)
  const [mentionedBooks, setMentionedBooks] = useState<
    Record<string, string>
  >({})

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingAnswer])

  // Removed: useEffect syncing activeBookId — hook now takes the full array directly

  const filteredBooks = books.filter((b) => {
    const alreadySelected = selectedBooks.some((s) => s.id === b._id)
    if (alreadySelected) return false
    if (!mentionQuery) return true
    return b.title.toLowerCase().includes(mentionQuery.toLowerCase())
  })

  const addBook = useCallback((book: { _id: string; title: string }) => {

    setSelectedBooks((prev) =>
      prev.some((s) => s.id === book._id) ? prev : [...prev, { id: book._id, title: book.title }]
    )
    setInput((prev) => {
      return prev.replace(
        /@\w*$/,
        `@${book.title} `
      )
    })
    setMentionedBooks((prev) => ({
      ...prev,
      [`@${book.title}`]: book._id
    }))
 
    setShowMentionMenu(false)
    setMentionQuery('')
    mentionStartRef.current = -1
    setTimeout(() => inputRef.current?.focus(), 0)

  }, [mentionQuery])                                             

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInput(val)

    const cursor = e.target.selectionStart ?? val.length
    const textUpToCursor = val.slice(0, cursor)
    const atIndex = textUpToCursor.lastIndexOf('@')

    if (atIndex !== -1) {
      const query = textUpToCursor.slice(atIndex + 1)

      mentionStartRef.current = atIndex
      setMentionQuery(query)
      setShowMentionMenu(true)
      setMentionMenuIndex(0)
      return

    }

    setShowMentionMenu(false)
    setMentionQuery('')
    mentionStartRef.current = -1
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu && filteredBooks.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionMenuIndex((i) => (i + 1) % filteredBooks.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionMenuIndex((i) => (i - 1 + filteredBooks.length) % filteredBooks.length)
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const book = filteredBooks[mentionMenuIndex]
        if (book)
          addBook({
            _id: book._id,
            title: book.title
          })
        return
      }
      if (e.key === 'Escape') {
        setShowMentionMenu(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = async () => {
    const q = input.trim()

    if (!q || isStreaming) return

    const matches = q.match(/@\S+/g) || []

    const selectedBookIds = matches
      .map((m) => mentionedBooks[m])
      .filter(Boolean)

    const cleanedQuery = q.replace(/@\S+/g, '').trim()

    if (!cleanedQuery) return

    setInput('')
    setShowMentionMenu(false)

    // temporary conversation id
    const tempConversationId =
      activeConversationId || nanoid()

    // create local conversation immediately
    if (!conversations[tempConversationId]) {
      startConversation(tempConversationId, selectedBookIds)
    }

    setActiveConversation(tempConversationId)

    // ADD USER MESSAGE IMMEDIATELY
    addMessage(tempConversationId, {
      id: nanoid(),
      role: 'user',
      content: q,
      contextBookIds: selectedBookIds,
      createdAt: new Date().toISOString(),
    })

    try {
      const {
        answer,
        sources: resolvedSources,
        conversationId,
      } = await sendMessage(cleanedQuery)

      // backend returned real conversation id
      const finalConversationId =
        conversationId || tempConversationId

      // assistant message
      addMessage(finalConversationId, {
        id: nanoid(),
        role: 'assistant',
        content: answer,
        sources: resolvedSources,
        createdAt: new Date().toISOString(),
      })

    } catch (error) {
      console.error(error)

      addMessage(tempConversationId, {
        id: nanoid(),
        role: 'assistant',
        content: 'Something went wrong.',
        createdAt: new Date().toISOString(),
      })
    }
  }


  return (
    <div className="flex flex-col relative h-full overflow-y-auto mx-auto">

      {/* Header */}
      <div className=' h-11 bg-transparent ' >
        <NavigationMenu className={cn(
          "fixed mt-2 ml-2"
        )}>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger className='cursor-pointer'>Omnis</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink className='cursor-pointer'>
                  <Sparkles /> Omnis plus <Button variant={"outline"}>Upgrade</Button>
                </NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Messages */}
      <div className="flex flex-col  max-w-3xl px-8 w-full pt-3 pb-[80px] mx-auto space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col  min-h-[50vh]  items-center justify-center h-full text-center space-y-3 mt-8">

            <p className="text-2xl text-neutral-600 dark:text-neutral-400">Hey <span className=" p-1 rounded-lg border-dashed shadow-md text-3xl text-neutral-950 dark:text-white font-bold text-shadow-md ">{user?.username || user?.firstName || "User"}</span>, Whats on your mind today ?</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="space-y-1.5">
            {/* Context badge on user message */}
            {msg.role === 'user' && msg.contextBookIds && msg.contextBookIds.length > 0 && (
              <div className="flex justify-end">
                <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                  {msg.contextBookIds.map((title, ti) => (
                    <span key={ti} className="flex items-center gap-1 text-xs bg-purple-300/20 shadow-sm text-neutral-600 dark:text-neutral-400  border rounded-full px-2 py-0.5">
                      <BookOpen className="h-2.5 w-2.5 " />
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          
            <div className={`flex  ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={` rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                ${msg.role === 'user'
                  ? 'bg-indigo-500 text-white rounded-br-sm shadow-sm border'
                  : ''
                }`}
                
                >
                <ReactMarkdown>
                {msg.content}
                </ReactMarkdown>
              </div>
            </div>

            {/* Source citations */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="ml-1 space-y-1">
                {msg.sources.map((s: Source, si: number) => (
                  <Accordion
                  typeof='single'
                  key={si}
                  className="rounded-xl shadow-sm border-b p-3 text-xs space-y-1 bg-neutral-50 dark:bg-neutral-900"
                  >
                    <AccordionItem>
                      <div className="font-medium">
                        Page {s.page}
                      </div>

                      <AccordionTrigger className="text-neutral-500">
                        {s?.reason}
                      </AccordionTrigger>

                      <AccordionContent className="line-clamp-2 italic">
                        "{s?.snippet}"
                      </AccordionContent>
                    </AccordionItem>
                    
                </Accordion>
                ))}
                
              </div>
            )}
          </div>
        ))}

        {/* Streaming bubble */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm max-w-sm">
              {streamingAnswer || (
                <span className="flex items-center gap-1.5 ">
                  <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                </span>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className='fixed bottom-[3%] right-[5%] max-w-3xl w-[calc(100%-10%)] z-50 flex flex-col gap-1.5'>
        
        {/* @ Mention dropdown */}
        <div className="relative  ">
          {showMentionMenu && filteredBooks.length > 0 && (
            <div className="absolute bottom-full mb-2 left-0 w-full bg-white dark:bg-neutral-900 border rounded-xl shadow-md overflow-hidden z-50 max-h-52 overflow-y-auto">
              <div className="px-3 py-1.5 border-b">
                <p className="text-xs font-medium">Your books</p>
              </div>
              {filteredBooks.map((book, idx) => (

                <button
                  key={book?._id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addBook({
                      _id: book._id,
                      title: book.title
                    })
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors
                             ${idx === mentionMenuIndex ? 'bg-indigo-200 dark:bg-indigo-800' : ''}`}
                >
                  <BookOpen className={`h-4 w-4 flex-shrink-0 `} />
                  <span className="text-sm truncate ">{book.title}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-center gap-2">
            
            <InputGroup className='border shadow-sm text-sm bg-linear-to-t from-neutral-200 dark:from-neutral-900 to-white dark:to-neutral-800'>
              <InputGroupTextarea
                ref={inputRef} 
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask something… or type @ to add a book"
                disabled={isStreaming}
                className={cn(
                  ""
                )}
              />
              <InputGroupAddon align="inline-end">
                <Button
                  variant={"outline"}
                  onClick={handleSend}
                  disabled={isStreaming || !input.trim()}
                  className="flex items-center gap-2 px-4 h-[40px] text-sm font-semibold cursor-pointer bg-linear-to-t from-indigo-500 to-purple-600 text-white hover:text-white rounded-lg shadow-md shadow-indigo-500/25 transition-all border-none border-b border-neutral-200 hover:shadow-indigo-500/40 hover:from-indigo-600 hover:to-purple-700"
                >
                  {isStreaming
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />
                  }
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </div>
      
    </div>
  )
}