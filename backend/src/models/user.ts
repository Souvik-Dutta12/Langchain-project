import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    clerkUserId: string  
    email: string      
    isActive: boolean
    lastSeen: Date
    createdAt: Date
}

const UserSchema = new Schema<IUser>({
    clerkUserId: { 
        type: String, 
        required: true, 
        unique: true, 
        index: true 
    },
    email:{ 
        type: String, 
        default: ''
    },
    isActive:{ 
        type: Boolean, 
        default: true 
    },
    lastSeen: { 
        type: Date, 
        default: Date.now 
    },
  }, { timestamps: true })

export const User = mongoose.model<IUser>('User', UserSchema);