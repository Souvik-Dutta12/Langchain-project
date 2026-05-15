import mongoose, { Schema, Document } from 'mongoose'

export interface IConversation extends Document {
  ownerClerkId: string
  bookIds: string[]
  title: string
  createdAt: Date
}

const ConversationSchema = new Schema<IConversation>({
  ownerClerkId: { 
    type: String, 
    required: true, 
    index: true
  },
  bookIds:{ 
    type: [String], 
    required: true,
    default: []
  },
  title:{ 
    type: String, 
    default: 'New Conversation' 
  },
}, { timestamps: true })

export const ConversationModel = mongoose.model<IConversation>('Conversation', ConversationSchema)