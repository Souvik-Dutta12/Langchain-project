import mongoose from 'mongoose'
import { env } from './env.js'

let isConnected = false

export async function connectToDatabase(): Promise<void> {

    if (isConnected) return
    try {
        const connectionInstance = await mongoose.connect(env.MONGODB_URL);
        isConnected = true;
        console.log(`\nMongodb connected !! DB Host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
        throw error;
    }
}
