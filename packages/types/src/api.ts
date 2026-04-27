export interface Book {
    id: string
    title: string
    author: string
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
    sources: Source[]
    createdAt: string
}
  
export interface Source {
    page: number
    chunk: string
    bookId: string
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