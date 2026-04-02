'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TnsPublicationDocument } from '@/lib/tenderned'
import type { Document } from '@/lib/db'
import {
  TENDER_DOCUMENTS_PROGRESS,
  type TenderDocumentsProgressDetail,
} from '@/lib/tenderDocumentEvents'
import { TenderNedBijlagenCatalog } from '@/components/tenders/TenderNedBijlagenCatalog'
import { Badge } from '@/components/ui/Badge'
import { fileTypeIcon, formatFileSize, filenameTitleAndExtension, formatDate } from '@/lib/utils'
import { Download, Eye } from 'lucide-react'

interface TenderDocumentsLiveSectionProps {
  tenderId: string
  showTenderNedCatalog: boolean
  tnsDocuments: TnsPublicationDocument[] | null
  initialDocuments: Document[]
  manualDocuments: Document[]
}

export function TenderDocumentsLiveSection({
  tenderId,
  showTenderNedCatalog,
  tnsDocuments,
  initialDocuments,
  manualDocuments,
}: TenderDocumentsLiveSectionProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [forcedPoll, setForcedPoll] = useState(false)

  useEffect(() => {
    setDocuments(initialDocuments)
  }, [initialDocuments])

  const activeByStatus = useMemo(
    () =>
      documents.some(
        (d) =>
          d.blob_status === 'downloading' ||
          d.summary_status === 'processing'
      ),
    [documents]
  )

  const fetchDocuments = useCallback(async () => {
    const res = await fetch(`/api/tenders/${tenderId}/documents`, {
      cache: 'no-store',
    })
    if (!res.ok) return
    const next = (await res.json()) as Document[]
    setDocuments(next)
  }, [tenderId])

  useEffect(() => {
    const onProgress = (e: Event) => {
      const ce = e as CustomEvent<TenderDocumentsProgressDetail>
      const d = ce.detail
      if (!d || d.tenderId !== tenderId) return
      if (d.phase === 'start') {
        setForcedPoll(true)
        void fetchDocuments()
      } else {
        setForcedPoll(false)
        void fetchDocuments()
        router.refresh()
      }
    }
    window.addEventListener(TENDER_DOCUMENTS_PROGRESS, onProgress)
    return () => window.removeEventListener(TENDER_DOCUMENTS_PROGRESS, onProgress)
  }, [tenderId, fetchDocuments, router])

  useEffect(() => {
    if (!forcedPoll && !activeByStatus) return
    const id = window.setInterval(() => {
      void fetchDocuments()
    }, 900)
    return () => window.clearInterval(id)
  }, [forcedPoll, activeByStatus, fetchDocuments])

  const syncedByExternalId = useMemo(() => {
    const m = new Map<string, Document>()
    for (const d of documents) {
      if (d.external_document_id) {
        m.set(d.external_document_id, d)
      }
    }
    return m
  }, [documents])

  return (
    <>
      {showTenderNedCatalog && tnsDocuments && (
        <TenderNedBijlagenCatalog
          documents={tnsDocuments}
          syncedByExternalId={syncedByExternalId}
        />
      )}

      {manualDocuments.length > 0 && (
        <ul className="mt-4 space-y-2 list-none p-0 m-0" aria-label="Lijst van bijlagen">
          {showTenderNedCatalog && (
            <li className="list-none mb-2">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">
                Handmatig geüpload
              </p>
            </li>
          )}
          {manualDocuments.map((doc) => {
            const live = documents.find((x) => x.id === doc.id) ?? doc
            const { title, extension } = filenameTitleAndExtension(
              live.name,
              live.type
            )
            return (
              <li key={doc.id}>
                <div className="card flex items-center gap-3 p-3">
                  <span className="text-lg" aria-hidden="true">
                    {fileTypeIcon(live.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <p className="text-sm text-foreground truncate" title={live.name}>
                        {title}
                      </p>
                      {extension ? (
                        <Badge variant="neutral" className="font-mono text-xs shrink-0">
                          .{extension}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted shrink-0">—</span>
                      )}
                      <ManualDocStatusBadges doc={live} />
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {formatFileSize(live.size)} · {formatDate(live.created_at)}
                      {live.source === 'tenderned' && (
                        <span className="text-muted/80"> · TenderNed</span>
                      )}
                    </p>
                  </div>
                  {live.blob_url && live.blob_status === 'synced' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={live.blob_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted hover:text-blue-light transition-colors p-1.5 rounded-md hover:bg-muted/40"
                        aria-label={`Bekijk ${live.name}`}
                        title="Bekijken"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <a
                        href={live.blob_url}
                        download={live.name}
                        className="text-muted hover:text-blue-light transition-colors p-1.5 rounded-md hover:bg-muted/40"
                        aria-label={`Download ${live.name}`}
                        title="Downloaden"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

function ManualDocStatusBadges({ doc }: { doc: Document }) {
  if (doc.blob_status === 'downloading') {
    return (
      <Badge variant="neutral" className="text-xs">
        Verwerken…
      </Badge>
    )
  }
  if (doc.blob_status === 'failed') {
    return (
      <Badge variant="neutral" className="text-xs text-velocity-red">
        Download mislukt
      </Badge>
    )
  }
  if (doc.summary_status === 'processing') {
    return (
      <Badge variant="neutral" className="text-xs">
        Samenvatting…
      </Badge>
    )
  }
  if (doc.summary_status === 'pending' && doc.blob_status === 'synced') {
    return (
      <Badge variant="neutral" className="text-xs">
        Wacht op samenvatting
      </Badge>
    )
  }
  if (doc.summary_status === 'failed') {
    return (
      <Badge variant="neutral" className="text-xs text-velocity-red">
        Samenvatting mislukt
      </Badge>
    )
  }
  return null
}
