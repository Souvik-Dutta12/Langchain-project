import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileUploader } from '@/main_components/FileUploader'
import { useBooksStore } from '@/store/useBooksStore'
import { BookOpen, Loader2, AlertCircle } from 'lucide-react'
import type { Book } from '../../../packages/types/src'
import Navbar from '@/main_components/Navbar'


function BookCard({ book }: { book: Book }) {
    const statusColors = {
        pending: 'text-gray-400',
        processing: 'text-yellow-500',
        ready: 'text-green-500',
        failed: 'text-red-500',
    }

    return (
        <Link
            to={book.status === 'ready' ? `/books/${book.id}` : '#'}
            className={`block p-4 border rounded-xl hover:shadow-md transition-shadow bg-white
        ${book.status !== 'ready' ? 'opacity-70 cursor-default' : ''}`}
        >
            <div className="flex items-start gap-3">
                <BookOpen className="h-8 w-8 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                    <p className="font-medium truncate">{book.title}</p>
                    <p className="text-sm text-gray-400">{book.pageCount} pages · {(book.fileSize / 1024 / 1024).toFixed(1)} MB</p>
                    <div className="flex items-center gap-1 mt-1">
                        {book.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />}
                        {book.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-500" />}
                        <span className={`text-xs capitalize ${statusColors[book.status]}`}>
                            {book.status === 'processing'
                                ? `Processing ${book.processingProgress}%`
                                : book.status}
                        </span>
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
            <div className='h-[15%] '>
                <Navbar />
            </div>

            <main className="w-screen p-2 rounded-xl  h-[85%] mx-auto  space-y-8">
                <FileUploader />

                <section>
                    <h2 className="text-lg font-semibold mb-4">Your Books</h2>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
                        </div>
                    ) : books.length === 0 ? (
                        <p className="text-center text-gray-400 py-12">No books yet — upload a PDF above</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {books.map((book) => (
                                <BookCard key={book.id} book={book} />
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}