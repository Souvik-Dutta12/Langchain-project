import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import apiClient from '@/api/client'

export default function Summary() {
    const { id: bookId } = useParams<{ id: string }>()
    const [summary, setSummary] = useState('')
    const [loading, setLoading] = useState(false)

    const generate = async () => {
        setLoading(true)
        try {
            const { data } = await apiClient.post<{ summary: string }>('/reports/generate', {
                bookId,
                topic: 'Complete overview and summary of the entire book',
            })
            setSummary(data.markdown)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
                <Link to={`/books/${bookId}`} className="p-1 rounded hover:bg-gray-100">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="font-semibold">Book Summary</h1>
            </header>

            <main className="max-w-3xl mx-auto p-6 space-y-6">
                {!summary && (
                    <div className="bg-white rounded-2xl border p-8 text-center space-y-4">
                        <p className="text-gray-500">Generate an AI summary of the entire book</p>
                        <button
                            onClick={generate}
                            disabled={loading}
                            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Summarizing (may take a minute)…</> : 'Generate Summary'}
                        </button>
                    </div>
                )}

                {summary && (
                    <div className="bg-white rounded-2xl border p-6">
                        <h2 className="font-semibold mb-4">Summary</h2>
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
                            {summary}
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}