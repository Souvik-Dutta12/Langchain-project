import mongoose, { Schema, Document } from 'mongoose'

export interface IMessage extends Document {
    conversationId: string
    role: 'user' | 'assistant'
    content: string
    sources: Array<{ 
        page: number; 
        chunk: string; 
        bookId: string 
    }>
    tokensUsed: number
    createdAt: Date
  }
  
  const MessageSchema = new Schema<IMessage>({
    conversationId: { 
        type: String, 
        required: true, 
        index: true
    },
    role: { 
        type: String, 
        enum: ['user', 'assistant'], 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    sources: { 
        type: [
            { 
                page: Number, 
                chunk: String, 
                bookId: String 
            }
        ], 
        default: []
    },
    tokensUsed: { 
        type: Number, 
        default: 0 
    },
  }, { timestamps: true })
  
  export const MessageModel = mongoose.model<IMessage>('Message', MessageSchema)