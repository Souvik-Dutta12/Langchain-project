import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Download } from 'lucide-react'
import apiClient from '@/api/client'
import type { ReportResponse } from '../../../../packages/types/src'

export default function ReportBuilder() {
    const { id: bookId } = useParams<{ id: string }>()
    const [topic, setTopic] = useState('')
    const [report, setReport] = useState<ReportResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const generate = async () => {
        if (!topic.trim()) return
        setLoading(true)
        setError('')
        try {
            const { data } = await apiClient.post<ReportResponse>('/reports/generate', {
                bookId,
                topic,
            })
            setReport(data)
        } catch {
            setError('Failed to generate report. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const downloadPDF = async () => {
        if (!report) return
        const { data } = await apiClient.post('/reports/export-pdf', {
            markdown: report.markdown,
        }, { responseType: 'blob' })

        const url = URL.createObjectURL(data)
        const a = document.createElement('a')
        a.href = url
        a.download = `report-${topic.replace(/\s+/g, '-')}.pdf`
        a.click()
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
                <Link to={`/books/${bookId}`} className="p-1 rounded hover:bg-gray-100">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="font-semibold">Report Builder</h1>
            </header>

            <main className="max-w-3xl mx-auto p-6 space-y-6">
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                    <label className="block">
                        <span className="text-sm font-medium text-gray-700">Report Topic</span>
                        <input
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && generate()}
                            placeholder="e.g. Machine Learning fundamentals, Chapter 3 concepts..."
                            className="mt-1 w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </label>
                    <button
                        onClick={generate}
                        disabled={loading || !topic.trim()}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : 'Generate Report'}
                    </button>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>

                {report && (
                    <div className="bg-white rounded-2xl border p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold">Generated Report</h2>
                            <button
                                onClick={downloadPDF}
                                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-500"
                            >
                                <Download className="h-4 w-4" /> Download PDF
                            </button>
                        </div>
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
                            {report.markdown}
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}