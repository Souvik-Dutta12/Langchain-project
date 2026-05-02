import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { PineconeStore } from '@langchain/pinecone'
import { env } from '../config/env.js'
import { Document } from '@langchain/core/documents'
import { pinecone } from '../config/pinecone.js'

export const embeddings = new GoogleGenerativeAIEmbeddings({
    model: 'text-embedding-004',
    apiKey: env.GOOGLE_API_KEY
})

export async function embedAndUpsert(
    chunks: Document[],
    namespace: string
): Promise<void> {
    const index = pinecone.index(env.PINECONE_INDEX_NAME)
    const batchSize = 100

    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize)

        await PineconeStore.fromDocuments(
            batch,
            embeddings,
            {
                pineconeIndex: index,
                namespace,
            }
        )

        const batchNum = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(chunks.length / batchSize)
        console.log(`Embedded batch ${batchNum}/${totalBatches}`)



        // Small delay to respect Gemini embedding rate limits
        if (i + batchSize < chunks.length) {
            await new Promise((r) => setTimeout(r, 500))
        }

    }
}


export async function getVectorStore(namespace: string): Promise<PineconeStore> {
    const index = pinecone.index(env.PINECONE_INDEX_NAME)
    return PineconeStore.fromExistingIndex(
        embeddings,
        {
            pineconeIndex: index,
            namespace
        }
    )
}