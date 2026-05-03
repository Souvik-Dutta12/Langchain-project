import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Required for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString()

interface Props {
    pdfUrl: string
    currentPage?: number
    onPageChange?: (page: number) => void
}

export function PDFViewer({ pdfUrl, currentPage = 1, onPageChange }: Props) {
    const [numPages, setNumPages] = useState(0)
    const [page, setPage] = useState(currentPage)

    const goTo = (p: number) => {
        const clamped = Math.max(1, Math.min(p, numPages))
        setPage(clamped)
        onPageChange?.(clamped)
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto flex justify-center bg-gray-100 p-4">
                <Document
                    file={pdfUrl}
                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    loading={<p className="text-gray-400 mt-20">Loading PDF…</p>}
                >
                    <Page
                        pageNumber={page}
                        width={600}
                        renderTextLayer
                        renderAnnotationLayer
                    />
                </Document>
            </div>

            <div className="flex items-center justify-center gap-4 py-3 border-t bg-white text-sm">
                <button
                    onClick={() => goTo(page - 1)}
                    disabled={page <= 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="text-gray-600">
                    Page{' '}
                    <input
                        type="number"
                        value={page}
                        onChange={(e) => goTo(Number(e.target.value))}
                        className="w-12 text-center border rounded px-1 py-0.5 text-sm"
                    />
                    {' '}of {numPages}
                </span>

                <button
                    onClick={() => goTo(page + 1)}
                    disabled={page >= numPages}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}