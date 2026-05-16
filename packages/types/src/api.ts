export interface Book {
    _id: string
    title: string
    author: string
    r2Url: string
    status: 'pending' | 'processing' | 'ready' | 'failed'
    processingProgress: number   
    pageCount: number
    fileSize: number
    createdAt: string
}

export interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    sources?: Source[]
    contextBookIds?: string[]
    createdAt: string
}

export interface Conversation {
    id: string                  // matches DB conversationId
    bookIds: string[]
    messages: ChatMessage[]
    createdAt: string
 }
  
export interface Source {
    page: number
    bookId: string
    reason?: string
    snippet?: string
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

export interface ReportResponse {
    markdown: string
    sources: Array<{ 
        page: number; 
        chunk: string 
    }>
}