import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileUploader } from '@/main_components/FileUploader'
import { useBooksStore } from '@/store/useBooksStore'
import { BookOpen, Loader2, AlertCircle } from 'lucide-react'
import type { Book } from '../../../packages/types/src'
import Navbar from '@/main_components/Navbar'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

function BookCard({ book }: { book: Book }) {
    const statusColors = {
        pending: 'text-neutral-400',
        processing: 'text-yellow-500',
        ready: 'text-green-500',
        failed: 'text-red-500',
    }

    return (
        <Link
            to={book.status === 'ready' ? `/books/${book.id}` : '#'}
            className={cn(
                `block p-4 border rounded-md hover:shadow-md transition-shadow bg-white dark:bg-neutral-950
        ${book.status !== 'ready' ? 'opacity-70 cursor-default' : ''}`,

            )}
        >
            <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{book.title}.pdf</p>
                    <p className="text-xs text-neutral-400 ">{book.pageCount} pages · {(book.fileSize / 1024 / 1024).toFixed(1)} MB</p>
                    <div className="flex items-center justify-between gap-1 mt-1">
                        {book.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />}
                        {book.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-500" />}
                        <span className={`text-xs capitalize ${statusColors[book.status]}`}>
                            {book.status === 'processing'
                                ? `Processing ${book.processingProgress}%`
                                : book.status}
                        </span>

                        <Button
                            className="flex items-center duration-300 gap-2 p-3 text-sm font-semibold cursor-pointer bg-linear-to-t from-indigo-500 to-purple-600 text-white rounded-md shadow-lg shadow-indigo-500/25 transition-all border-none border-b border-neutral-200 hover:shadow-indigo-500/40 hover:from-indigo-600 hover:to-purple-700"
                        >

                            Preview
                        </Button>
                    </div>
                </div>
            </div>
        </Link>
    )
}

export default function Dashboard() {
    const { books, loading, fetchBooks } = useBooksStore()

    useEffect(() => { fetchBooks() }, [])

    return (
        <div className="h-screen  bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 selection:bg-indigo-500/30">
            <div className='h-[13%] '>
                <Navbar />
            </div>

            <main className="w-screen p-2 rounded-xl  h-[87%] border mx-auto  space-y-8 flex gap-3 justify-between ">
                <div className="left h-full w-1/5 flex flex-col gap-3">
                    <div className={cn(
                        "up w-full h-1/2 rounded-md border  p-3",


                    )}>
                        <FileUploader />

                    </div>
                    <div className={cn(
                        "down  overflow-y-scroll w-full h-1/2 rounded-md border  p-3",
                        "shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]"
                    )}>
                        <section >
                            <h2 className="text-lg font-semibold mb-4">Your Pdfs</h2>
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
                                </div>
                            ) : books.length === 0 ? (
                                <p className="text-center text-gray-400 py-12">No books yet — upload a PDF above</p>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {books.map((book) => (
                                        <BookCard key={book.id} book={book} />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
                <div className={cn(
                    "right h-full w-4/5 rounded-md border  flex ",
                    "shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]"
                )}>
                    <div className="left h-full w-1/4 rounded-l-md border-r "></div>
                    <div className="right h-full w-3/4 rounded-r-md"></div>
                </div>


            </main>
        </div>
    )
}