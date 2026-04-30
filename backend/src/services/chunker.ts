import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { PageData } from "./pdfIngestion.js";
import { Document } from "@langchain/core/documents";

export async function chunkPages(
    pages: PageData[],
    bookId: string
): Promise<Document[]> {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 800,
        chunkOverlap: 150,
        separators: ['\n\n', '\n', '. ', ' ', ''],
    })

    const allChunks: Document[] = []

    for (const page of pages){
        const texts = await splitter.splitText(page.text)

        Promise.resolve(texts).then((chunks)=>{
            chunks.forEach((chunk,idx) => {
                allChunks.push(
                    new Document({
                        pageContent: chunk,
                        metadata: {
                            bookId,
                            page: page.page,
                            chunkId: `&{bookId}-p${page.page}-c${idx}`,
                        },
                    })
                )
            })
        })

    }
    return allChunks


}