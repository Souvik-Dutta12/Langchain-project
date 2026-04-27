import mongoose from 'mongoose'
import { env } from '../config/env.js'

export async function connectToDatabase(): Promise<void> {
    try {
        const connectionInstance = await mongoose.connect(env.MONGODB_URL);
        console.log(`\nMongodb connected !! DB Host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}