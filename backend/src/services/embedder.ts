import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { PineconeStore } from '@langchain/pinecone'
import { env } from '../config/env.js'
import { Document } from '@langchain/core/documents'
import { pinecone } from '../config/pinecone.js'
import { HfInference } from '@huggingface/inference'

const hf = new HfInference(env.HUGGINGFACE_API_KEY)
const EMBED_MODEL = 'BAAI/bge-small-en-v1.5'

async function getEmbedding(text: string): Promise<number[]> {
    const result = await hf.featureExtraction({
        model: EMBED_MODEL,
        inputs: text,
    })

    // HF returns different shapes depending on model:
    // - 1D: number[]  → use directly
    // - 2D: number[][] → take first row (mean pooling already applied)
    // - 3D: number[][][] → need to mean-pool manually

    if (typeof (result as any)[0] === 'number') {
        // Already flat 1D
        return result as number[]
    } else if (Array.isArray((result as any)[0]) && typeof (result as any)[0][0] === 'number') {
        // 2D — take first row
        return (result as number[][])[0]
    } else {
        // 3D — mean pool across tokens
        const matrix = (result as number[][][])[0]
        const dim = matrix[0].length
        const pooled = new Array(dim).fill(0)
        for (const tokenVec of matrix) {
            for (let i = 0; i < dim; i++) pooled[i] += tokenVec[i]
        }
        return pooled.map(v => v / matrix.length)
    }
}

export async function embedAndUpsert(
    chunks: Document[],
    namespace: string
): Promise<void> {

    const index = pinecone.index(env.PINECONE_INDEX_NAME)
    const ns = index.namespace(namespace)
    const batchSize = 20

    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize)

        const vectors = await Promise.all(
            batch.map(async (doc, idx) => {
                const values = await getEmbedding(doc.pageContent)
                console.log('vec shape:', values.length, typeof values[0])

                return {
                    id: doc.metadata.chunkId ?? `chunk-${i + idx}`,
                    values,
                    metadata: {
                        bookId: doc.metadata.bookId as string,
                        page: doc.metadata.page as number,
                        text: doc.pageContent.slice(0, 500), // Pinecone metadata limit
                    },
                }
            })
        )

        
        console.log(`Batch ${Math.floor(i / batchSize) + 1} — dim: ${vectors[0].values.length}`)
        await ns.upsert(vectors)

        // Respect Gemini rate limits
        await new Promise((r) => setTimeout(r, 1000))

    }
}

export async function similaritySearch(
    query: string,
    namespace: string,
    topK = 6
) {

    const queryVector = await getEmbedding(query)

    const index = pinecone.index(env.PINECONE_INDEX_NAME)
    const results = await index.namespace(namespace).query({
        vector: queryVector,
        topK,
        includeMetadata: true,
    })

    return results.matches.map((m) => ({
        pageContent: m.metadata?.text as string ?? '',
        metadata: {
            page: m.metadata?.page,
            bookId: m.metadata?.bookId,
        },
    }))
}