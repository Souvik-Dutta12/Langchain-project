import { useEffect, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { cn } from '@/lib/utils'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Required for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface Props {
    pdfUrl: string
    currentPage?: number
    onPageChange?: (page: number) => void
    onClose?: () => void
}


export function PDFViewer({ pdfUrl, currentPage = 1, onPageChange, onClose }: Props) {
    const [numPages, setNumPages] = useState(0)
    const [page, setPage] = useState(currentPage)

    const goTo = (p: number) => {
        const clamped = Math.max(1, Math.min(p, numPages))
        setPage(clamped)
        onPageChange?.(clamped)
    }


    return (
        <>
            <style>{`
                @keyframes fogDrift {
                    0%   { box-shadow: inset 0 0 80px 20px rgba(99,102,241,0.5), inset 0 0 140px 40px rgba(147,51,234,0.2); }
                    25%  { box-shadow: inset 0 0 120px 40px rgba(99,102,241,0.35), inset 0 0 80px 10px rgba(147,51,234,0.35); }
                    50%  { box-shadow: inset 0 0 60px 10px rgba(99,102,241,0.6), inset 0 0 160px 60px rgba(147,51,234,0.15); }
                    75%  { box-shadow: inset 0 0 100px 30px rgba(99,102,241,0.4), inset 0 0 60px 5px rgba(147,51,234,0.4); }
                    100% { box-shadow: inset 0 0 80px 20px rgba(99,102,241,0.5), inset 0 0 140px 40px rgba(147,51,234,0.2); }
                }
                .fog-shadow {
                    animation: fogDrift 6s ease-in-out infinite;
                }
            `}</style>

            <div className={cn(
                "flex flex-col h-full w-4/5 rounded-md border-indigo-500", "fog-shadow"
                
            )}>
                <div className="flex items-center gap-3 px-4 py-2 border-b">
                    <Button
                        variant={"outline"}
                        onClick={onClose}
                        className="flex items-center bg-neutral-200/10 hover:bg-neutral-200/30  gap-1.5 text-sm  transition-colors cursor-pointer"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </Button>
                </div>
                <div className="flex-1 overflow-auto flex justify-center ">
                    <Document
                        file={pdfUrl}
                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                        loading={<p className=" mt-50 text-xl">Loading PDF…</p>}
                    >
                        <Page
                            pageNumber={page}
                            width={1000}
                            renderTextLayer
                            renderAnnotationLayer
                        />
                    </Document>
                </div>

                <div className="border-t py-3">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => goTo(page - 1)}
                                    className={page <= 1 ? 'pointer-events-none opacity-30 ' : 'cursor-pointer'}
                                />
                            </PaginationItem>

                            {Array.from({ length: numPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === numPages || Math.abs(p - page) <= 1)
                                .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis')
                                    acc.push(p)
                                    return acc
                                }, [])
                                .map((p, idx) =>
                                    p === 'ellipsis' ? (
                                        <PaginationItem key={`ellipsis-${idx}`}>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    ) : (
                                        <PaginationItem key={p}>
                                            <PaginationLink
                                                isActive={page === p}
                                                onClick={() => goTo(p)}
                                                className="cursor-pointer"
                                            >
                                                {p}
                                            </PaginationLink>
                                        </PaginationItem>
                                    )
                                )}

                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => goTo(page + 1)}
                                    className={page >= numPages ? 'pointer-events-none opacity-30' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            </div>
        </>
    )
}