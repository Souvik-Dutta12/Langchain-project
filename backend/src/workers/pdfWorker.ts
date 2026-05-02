import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import { connectToDatabase } from "../config/db.js";
import { ensurePineconeIndex, pinecone } from "../config/pinecone.js";
import { Job, Worker } from "bullmq";
import { BookModel } from "../models/book.js";
import { extractTextWithPages } from "../services/pdfIngestion.js";
import { chunkPages } from "../services/chunker.js";
import { embedAndUpsert } from "../services/embedder.js";

// Cloudflare R2 client — S3-compatible
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY
    },
})

interface IngestionJobData {
    bookId: string
    r2Key: string
    userId: string
    namespace: string
}

async function startWorker() {

    await connectToDatabase()
    await ensurePineconeIndex()

    const worker = new Worker<IngestionJobData>(
        'pdf-ingestion',
        async (job: Job<IngestionJobData>) => {
            const { bookId, r2Key, userId, namespace } = job.data
            console.log(`Starting ingestion for book ${bookId}`)

            // mark as proccessing
            await BookModel.updateOne(
                { _id: bookId },
                {
                    status: 'processing',
                    processingProgress: 5
                }
            )

            //download pdf from r2
            const r2Response = await r2.send(
                new GetObjectCommand({
                    Bucket: env.R2_BUCKET_NAME,
                    Key: r2Key
                })
            )
            const pdfBuffer = Buffer.from(
                await r2Response.Body!.transformToByteArray()
            )
            console.log(`Downloaded ${(pdfBuffer.length / 1024 / 1024).toFixed(1)}MB from R2`)
            await BookModel.updateOne(
                { _id: bookId },
                { processingProgress: 20 }
            )


            // extract text per page
            const pages = await extractTextWithPages(pdfBuffer)
            console.log(`Extracted text from ${pages.length} pages`)
            await BookModel.updateOne(
                { _id: bookId },
                {
                    processingProgress: 40,
                    pageCount: pages.length
                }
            )

            // chunk into langchain document
            const chunks = await chunkPages(pages, bookId)
            console.log(` Created ${chunks.length} chunks`)
            await BookModel.updateOne(
                { _id: bookId },
                { processingProgress: 60 }
            )


            //embed + upsert into pinecone
            await embedAndUpsert(chunks, namespace)
            console.log(`Upserted ${chunks.length} vectors to Pinecone namespace "${namespace}"`)
            await BookModel.updateOne(
                { _id: bookId },
                { processingProgress: 95 }
            )


            //ready mark
            await BookModel.updateOne(
                { _id: bookId },
                {
                    status: 'ready',
                    processingProgress: 100
                }
            )
            console.log(`Book ${bookId} ready`)

        }, {
        connection: { url: env.REDIS_URL },
        concurrency: 2,// process 2 PDFs simultaneously
        limiter: {
            max: 8,// max 8 Gemini embedding calls per...
            duration: 1000// ...1 second (respect rate limits)
        }
    }
    )

    worker.on('failed', async (job, err) => {
        console.error(`Job ${job?.id} failed:`, err.message)
        if (job) {
            await BookModel.updateOne(
                { _id: job.data.bookId },
                { status: 'failed' }
            )
        }
    })

    worker.on('completed', (job) => {
        console.log(`Job ${job.id} completed`)
    })

    console.log('🔧 PDF ingestion worker started')

}

startWorker().catch(console.error)