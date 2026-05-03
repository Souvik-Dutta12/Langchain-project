import { useCallback, useState } from 'react'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import apiClient from '@/api/client'
import { useBooksStore } from '@/store/useBooksStore'
import { pollBookStatus } from '@/hooks/useBooks'
import type { Book } from '../../../packages/types/src'
import { FileUpload } from "@/components/ui/file-upload"

export function FileUploader() {
    const [uploadProgress, setUploadProgress] = useState(0)
    const [processingProgress, setProcessingProgress] = useState(0)
    const [stage, setStage] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle')
    const addBook = useBooksStore((s) => s.addBook)

    const onDrop = useCallback(async (accepted: File[]) => {
        const file = accepted[0]
        if (!file) return

        setStage('uploading')
        setUploadProgress(0)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const { data } = await apiClient.post<{ bookId: string }>(
                '/books/upload',
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (e) => {
                        if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100))
                    },
                }
            )

            setStage('processing')

            addBook({
                id: data.bookId,
                title: file.name.replace(/\.pdf$/i, ''),
                author: '',
                status: 'processing',
                processingProgress: 0,
                pageCount: 0,
                fileSize: file.size,
                createdAt: new Date().toISOString(),
            } as Book)

            const stop = pollBookStatus(data.bookId, (progress, status) => {
                setProcessingProgress(progress)
                if (status === 'ready') {
                    setStage('done')
                    setTimeout(() => setStage('idle'), 2000)
                } else if (status === 'failed') {
                    setStage('error')
                }
            })

            return stop
        } catch (err) {
            console.error('Upload failed:', err)
            setStage('error')
        }
    }, [addBook])

    return (
        <div
            className={`border border-neutral-300 bg-neutral-50 dark:bg-neutral-900/20 dark:border-neutral-700 border-dashed h-full rounded-md p-12 text-center transition-all duration-200 select-none ${stage !== 'idle' ? 'cursor-default' : 'cursor-pointer'}`}
        >
            {/* Always mounted so FileUpload doesn't lose its state; hidden via CSS when not idle */}
            <div className={`w-full max-w-4xl mx-auto h-full border border-dashed bg-neutral-50 dark:bg-black border-neutral-200 dark:border-neutral-800 rounded-lg ${stage !== 'idle' ? 'hidden' : ''}`}>
                <FileUpload onChange={onDrop} disabled={stage !== 'idle'} />
            </div>

            {stage === 'uploading' && (
                <div className="flex flex-col mt-7 items-center justify-center gap-4">
                    <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                    <p className="font-medium">Uploading... {uploadProgress}%</p>
                    <div className="w-64 bg-transparent border rounded-full h-2">
                        <div
                            className="bg-linear-to-t from-indigo-500 to-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {stage === 'processing' && (
                <div className="flex flex-col mt-5 items-center justify-center gap-4">
                    <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
                    <p className="font-medium">Processing PDF... {processingProgress}%</p>
                    <p className="text-sm text-gray-400">Extracting text · Embedding · Indexing</p>
                    <div className="w-64 bg-transparent border rounded-full h-2">
                        <div
                            className="bg-linear-to-t from-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${processingProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {stage === 'done' && (
                <div className="flex flex-col items-center gap-3 mt-6 text-green-600">
                    <CheckCircle className="h-10 w-10" />
                    <p className="font-medium">PDF ready!</p>
                </div>
            )}

            {stage === 'error' && (
                <div className="flex flex-col items-center gap-3 text-red-500">
                    <XCircle className="h-12 w-12" />
                    <p className="font-medium">Processing failed</p>
                    <button
                        onClick={(e) => { e.stopPropagation(); setStage('idle') }}
                        className="text-sm underline text-blue-500"
                    >
                        Try again
                    </button>
                </div>
            )}
        </div>
    )
}