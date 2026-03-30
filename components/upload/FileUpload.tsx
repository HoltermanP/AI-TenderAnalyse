'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn, formatFileSize, fileTypeIcon } from '@/lib/utils'
import { ALLOWED_TYPES, MAX_FILE_SIZE } from '@/lib/blob'

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

interface FileUploadProps {
  tenderId?: string
  /** `company` = bedrijfsdocumenten (strategie, jaarplan); geen tender-koppeling */
  variant?: 'tender' | 'company'
  onUploadComplete?: (file: { name: string; url: string; type: string }) => void
  accept?: string[]
}

export function FileUpload({
  tenderId,
  variant = 'tender',
  onUploadComplete,
  accept = ALLOWED_TYPES,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])

  const uploadFile = async (file: UploadedFile, rawFile: File) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, status: 'uploading' } : f))
    )

    try {
      const formData = new FormData()
      formData.append('file', rawFile)
      if (variant === 'company') {
        formData.append('scope', 'company')
      } else if (tenderId) {
        formData.append('tenderId', tenderId)
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? 'Upload mislukt')
      }

      const data = (await res.json()) as { url: string }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: 'done', url: data.url } : f
        )
      )

      onUploadComplete?.({ name: rawFile.name, url: data.url, type: rawFile.type })
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id
            ? {
                ...f,
                status: 'error',
                error: err instanceof Error ? err.message : 'Onbekende fout',
              }
            : f
        )
      )
    }
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadedFile[] = acceptedFiles.map((f) => ({
        id: `${Date.now()}_${f.name}`,
        name: f.name,
        size: f.size,
        type: f.type,
        status: 'pending' as const,
      }))

      setFiles((prev) => [...prev, ...newFiles])

      acceptedFiles.forEach((rawFile, i) => {
        void uploadFile(newFiles[i], rawFile)
      })
    },
    [tenderId, variant, onUploadComplete]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    maxSize: MAX_FILE_SIZE,
  })

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-ai-blue bg-ai-blue/10'
            : 'border-border-subtle hover:border-ai-blue/50 hover:bg-surface'
        )}
        role="button"
        aria-label="Bestanden uploaden"
      >
        <input {...getInputProps()} />
        <Upload
          className={cn(
            'w-10 h-10 mx-auto mb-3 transition-colors',
            isDragActive ? 'text-ai-blue' : 'text-muted'
          )}
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-foreground mb-1">
          {isDragActive
            ? 'Laat los om te uploaden'
            : 'Sleep bestanden hierheen of klik om te selecteren'}
        </p>
        <p className="text-xs text-muted">
          PDF, Word, Excel · Max 10 MB per bestand
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="card flex items-center gap-3 p-3"
            >
              <span className="text-lg" aria-hidden="true">
                {fileTypeIcon(file.type)}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted">{formatFileSize(file.size)}</p>
              </div>

              <div className="flex items-center gap-2">
                {file.status === 'uploading' && (
                  <div className="w-4 h-4 border-2 border-border-subtle border-t-ai-blue rounded-full animate-spin" />
                )}
                {file.status === 'done' && (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                )}
                {file.status === 'error' && (
                  <div className="flex items-center gap-1 text-velocity-red">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs">{file.error}</span>
                  </div>
                )}
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-muted hover:text-velocity-red transition-colors"
                  aria-label={`Verwijder ${file.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
