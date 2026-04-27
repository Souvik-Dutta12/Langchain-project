import mongoose, { Schema, Document } from 'mongoose'

export interface IConversation extends Document {
  ownerClerkId: string
  bookId: string
  title: string
  createdAt: Date
}

const ConversationSchema = new Schema<IConversation>({
  ownerClerkId: { 
    type: String, 
    required: true, 
    index: true
  },
  bookId:{ 
    type: String, 
    required: true 
  },
  title:{ 
    type: String, 
    default: 'New Conversation' 
  },
}, { timestamps: true })

export const ConversationModel = mongoose.model<IConversation>('Conversation', ConversationSchema)