import { Pinecone } from '@pinecone-database/pinecone'
import { env } from "./env.js"
import { string } from 'zod'

export const pinecone = new Pinecone({
    apiKey: env.PINECONE_API_KEY
})

export async function ensurePineconeIndex(): Promise<void>{
    const indexes = await pinecone.listIndexes()
    const exists = indexes.indexes?.some((i)=> i.name === env.PINECONE_INDEX_NAME)

    if(!exists) {
        await pinecone.createIndex({
            name: env.PINECONE_INDEX_NAME,
            dimension: 384, // 768
            metric: 'cosine',
            spec:{
                serverless: {
                    cloud: 'aws',
                    region: 'us-east-1',
                },
            }
        })

        console.log(`Pinecone index ${env.PINECONE_INDEX_NAME} created`)
    }else{
        console.log(`Pinecone index ${env.PINECONE_INDEX_NAME} ready`)
    }

}