import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
// 👇 Use legacy build for Node.js
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

export interface PageData {
    page: number
    text: string
}

export async function extractTextWithPages(pdfBuffer: Buffer): Promise<PageData[]> {
    const pages: PageData[] = []

    const loadingTask = getDocument({ data: new Uint8Array(pdfBuffer) })
    const pdfDocument = await loadingTask.promise

    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i)
        const textContent = await page.getTextContent()

        const text = textContent.items
            .map((item: any, i: number, arr: any[]) => {
                const str = item.str
                // Add newline if there's a vertical position change
                const nextItem = arr[i + 1]
                if (nextItem && Math.abs(nextItem.transform[5] - item.transform[5]) > 5) {
                    return str + '\n'
                }
                return str + ' '
            })
            .join('')
            .trim()

        if (text.length > 20) {
            pages.push({ page: i, text })
        }
    }

    return pages
}

