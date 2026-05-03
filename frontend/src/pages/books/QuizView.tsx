import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react'
import apiClient from '@/api/client'
import type { QuizQuestion } from '../../../../packages/types/src'

export default function QuizView() {
    const { id: bookId } = useParams<{ id: string }>()
    const [topic, setTopic] = useState('')
    const [numQuestions, setNumQuestions] = useState(10)
    const [questions, setQuestions] = useState<QuizQuestion[]>([])
    const [answers, setAnswers] = useState<Record<number, number>>({})
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)

    const generate = async () => {
        if (!topic.trim()) return
        setLoading(true)
        setAnswers({})
        setSubmitted(false)
        try {
            const { data } = await apiClient.post<{ questions: QuizQuestion[] }>('/quiz/generate', {
                bookId, topic, numQuestions,
            })
            setQuestions(data.questions)
        } finally {
            setLoading(false)
        }
    }

    const score = questions.filter((q, i) => answers[i] === q.correctIndex).length

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
                <Link to={`/books/${bookId}`} className="p-1 rounded hover:bg-gray-100">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="font-semibold">Quiz Generator</h1>
            </header>

            <main className="max-w-2xl mx-auto p-6 space-y-6">
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                    <div className="flex gap-3">
                        <input
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Quiz topic..."
                            className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                            value={numQuestions}
                            onChange={(e) => setNumQuestions(Number(e.target.value))}
                            className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {[5, 10, 15, 20].map((n) => (
                                <option key={n} value={n}>{n} Qs</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={generate}
                        disabled={loading || !topic.trim()}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : 'Generate Quiz'}
                    </button>
                </div>

                {questions.length > 0 && (
                    <>
                        <div className="space-y-4">
                            {questions.map((q, qi) => (
                                <div key={qi} className="bg-white rounded-2xl border p-5 space-y-3">
                                    <p className="font-medium text-sm">
                                        <span className="text-gray-400 mr-2">Q{qi + 1}.</span>
                                        {q.question}
                                        <span className="ml-2 text-xs text-gray-400">[Page {q.page}]</span>
                                    </p>
                                    <div className="space-y-2">
                                        {q.options.map((opt, oi) => {
                                            const selected = answers[qi] === oi
                                            const isCorrect = oi === q.correctIndex
                                            let cls = 'border rounded-lg px-4 py-2 text-sm w-full text-left transition-colors '

                                            if (!submitted) {
                                                cls += selected
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'hover:border-gray-300'
                                            } else {
                                                if (isCorrect) cls += 'border-green-500 bg-green-50 text-green-700'
                                                else if (selected && !isCorrect) cls += 'border-red-500 bg-red-50 text-red-600'
                                                else cls += 'opacity-50'
                                            }

                                            return (
                                                <button
                                                    key={oi}
                                                    onClick={() => !submitted && setAnswers((a) => ({ ...a, [qi]: oi }))}
                                                    className={cls}
                                                >
                                                    {opt}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {submitted && (
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            {answers[qi] === q.correctIndex
                                                ? <CheckCircle className="h-3 w-3 text-green-500" />
                                                : <XCircle className="h-3 w-3 text-red-500" />
                                            }
                                            {q.explanation}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {!submitted ? (
                            <button
                                onClick={() => setSubmitted(true)}
                                disabled={Object.keys(answers).length < questions.length}
                                className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-500 disabled:opacity-40 transition-colors"
                            >
                                Submit Quiz
                            </button>
                        ) : (
                            <div className="bg-white rounded-2xl border p-6 text-center">
                                <p className="text-3xl font-bold text-blue-600">{score}/{questions.length}</p>
                                <p className="text-gray-500 mt-1">
                                    {score === questions.length ? '🎉 Perfect score!' : `${Math.round((score / questions.length) * 100)}%`}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    )
}