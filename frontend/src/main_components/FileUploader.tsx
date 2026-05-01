import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, Loader2, CheckCircle, XCircle } from 'lucide-react'
import apiClient from '@/api/client'
import { useBooksStore } from '@/store/useBooksStore'
import { pollBookStatus } from '@/hooks/useBooks'
import type { Book } from '../../../packages/types/src'

export function FileUploader() {
    const [uploading, setUploading] = useState(false)
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

            // Add placeholder book to store
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

            // Poll until done
            const stop = pollBookStatus(data.bookId, (progress, status) => {
                setProcessingProgress(progress)
                if (status === 'ready') {
                    setStage('done')
                    setTimeout(() => setStage('idle'), 2000)
                } else if (status === 'failed') {
                    setStage('error')
                }
            })

            // Clean up if component unmounts
            return stop
        } catch (err) {
            console.error('Upload failed:', err)
            setStage('error')
        }
    }, [addBook])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 1,
        maxSize: 100 * 1024 * 1024,
        disabled: stage !== 'idle',
    })

    return (
        <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 select-none ${isDragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-200 hover:border-gray-400'} ${stage !== 'idle' ? 'cursor-default' : ''}
            `}
        >
            <input {...getInputProps()} />

            {stage === 'idle' && (
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <UploadCloud className="h-12 w-12 text-gray-300" />
                    <p className="font-medium text-gray-700">
                        {isDragActive ? 'Drop it!' : 'Drop your PDF here'}
                    </p>
                    <p className="text-sm">or <span className="text-blue-500 underline">browse</span> · Max 100MB</p>
                </div>
            )}

            {stage === 'uploading' && (
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                    <p className="font-medium">Uploading... {uploadProgress}%</p>
                    <div className="w-64 bg-gray-100 rounded-full h-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {stage === 'processing' && (
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
                    <p className="font-medium">Processing PDF... {processingProgress}%</p>
                    <p className="text-sm text-gray-400">Extracting text · Embedding · Indexing</p>
                    <div className="w-64 bg-gray-100 rounded-full h-2">
                        <div
                            className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${processingProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {stage === 'done' && (
                <div className="flex flex-col items-center gap-3 text-green-600">
                    <CheckCircle className="h-12 w-12" />
                    <p className="font-medium">Book ready!</p>
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