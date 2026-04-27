import mongoose, { Schema, Document } from 'mongoose'

export interface IBook extends Document {
  title: string
  author: string
  ownerClerkId: string        
  s3Key: string
  s3Url: string
  fileSize: number
  pageCount: number
  status: 'pending' | 'processing' | 'ready' | 'failed'
  processingProgress: number  // 0–100
  pineconeNamespace: string   // user_<clerkId>_book_<id>
  createdAt: Date
  updatedAt: Date
}

const BookSchema = new Schema<IBook>({
  title:{ 
    type: String, 
    required: true
    },
  author:{ 
    type: String, 
    default: '' 
    },
  ownerClerkId:{ 
    type: String, 
    required: true, 
    index: true 
    },
  s3Key:{ 
    type: String,
     default: '' 
    },
  s3Url:{ 
    type: String, 
    default: '' 
    },
  fileSize:{ 
    type: Number, 
    default: 0 
    },
  pageCount:{ 
    type: Number, 
    default: 0 
    },
  status:{ 
    type: String, 
    enum: ['pending', 'processing', 'ready', 'failed'], 
    default: 'pending' 
    },
  processingProgress: { 
    type: Number, 
    default: 0, 
    min: 0, 
    max: 100 
    },
  pineconeNamespace:{ 
    type: String, 
    default: '' 
    },
}, { timestamps: true })

export const BookModel = mongoose.model<IBook>('Book', BookSchema)