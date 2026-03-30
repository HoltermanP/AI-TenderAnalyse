'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileUpload } from '@/components/upload/FileUpload'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FileText, Trash2, ExternalLink, Loader2 } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

interface CompanyDoc {
  id: string
  name: string
  type: string
  size: number
  blob_url: string
  summary: string | null
  created_at: string
}

export function CompanyDocumentsSection() {
  const [documents, setDocuments] = useState<CompanyDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/bedrijfsinfo/bijlagen')
      if (res.ok) {
        const data = (await res.json()) as { documents?: CompanyDoc[] }
        setDocuments(data.documents ?? [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/bedrijfsinfo/bijlagen/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bedrijfsdocumenten voor AI-analyse</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted">
          Upload strategie, jaarplan, visie of andere interne documenten. Ze worden
          samengevat en automatisch meegenomen bij elke tender-analyse (naast de
          basisbedrijfsinfo hierboven).
        </p>

        <FileUpload
          variant="company"
          onUploadComplete={() => {
            void load()
          }}
        />

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Documenten laden…
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted py-2">
            Nog geen documenten. Ondersteunde formaten: PDF, Word, Excel, platte tekst.
          </p>
        ) : (
          <ul className="space-y-2">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border-subtle bg-surface/50"
              >
                <FileText
                  className="w-5 h-5 text-blue-light shrink-0 mt-0.5"
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {d.name}
                  </p>
                  <p className="text-xs text-muted">
                    {formatFileSize(d.size)} ·{' '}
                    {new Date(d.created_at).toLocaleDateString('nl-NL')}
                  </p>
                  {d.summary && (
                    <p className="text-xs text-muted mt-2 line-clamp-3">
                      {d.summary}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={d.blob_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-muted hover:text-blue-light transition-colors"
                    title="Download"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted hover:text-velocity-red"
                    disabled={deletingId === d.id}
                    onClick={() => void handleDelete(d.id)}
                    title="Verwijderen"
                  >
                    {deletingId === d.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
