import type { TnsPublicationDocument } from '@/lib/tenderned'
import type { Document } from '@/lib/db'
import { Badge } from '@/components/ui/Badge'
import { fileTypeIcon, formatFileSize } from '@/lib/utils'
import { Download, Eye } from 'lucide-react'

interface TenderNedBijlagenCatalogProps {
  documents: TnsPublicationDocument[]
  /** external_document_id → opgeslagen document */
  syncedByExternalId: Map<string, Document>
}

export function TenderNedBijlagenCatalog({
  documents,
  syncedByExternalId,
}: TenderNedBijlagenCatalogProps) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted py-3">
        Geen bijlagen volgens TenderNed voor deze publicatie.
      </p>
    )
  }

  return (
    <ul
      className="space-y-2 list-none p-0 m-0 mb-4"
      aria-label="TenderNed-bijlagen"
    >
      {documents.map((doc) => {
        const title =
          doc.documentNaam?.trim() || `Document ${doc.documentId ?? ''}`
        const typeLabel =
          doc.typeDocument?.omschrijving?.trim() ||
          doc.typeDocument?.code?.trim() ||
          null
        const hasHref = Boolean(doc.links?.download?.href)
        const virus = doc.virusIndicatie === true
        const stored = doc.documentId
          ? syncedByExternalId.get(doc.documentId)
          : undefined
        const mime = stored?.type ?? 'application/octet-stream'

        return (
          <li key={doc.documentId ?? title}>
            <div className="card flex items-start gap-3 p-3">
              <span className="text-lg shrink-0 pt-0.5" aria-hidden="true">
                {fileTypeIcon(mime)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground break-words">
                  {title}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {typeLabel && (
                    <span className="text-xs text-muted">{typeLabel}</span>
                  )}
                  {doc.grootte != null && doc.grootte > 0 && (
                    <span className="text-xs text-muted">
                      {formatFileSize(doc.grootte)}
                    </span>
                  )}
                  {virus && (
                    <Badge variant="neutral" className="text-xs">
                      Virusindicatie
                    </Badge>
                  )}
                  {!hasHref && !virus && (
                    <Badge variant="neutral" className="text-xs">
                      Geen downloadlink
                    </Badge>
                  )}
                  {stored ? (
                    <Badge variant="success" className="text-xs">
                      Opgeslagen op Blob
                    </Badge>
                  ) : hasHref && !virus ? (
                    <Badge variant="neutral" className="text-xs">
                      Nog niet opgeslagen
                    </Badge>
                  ) : null}
                </div>
              </div>
              {stored && (
                <div className="flex items-center gap-1 shrink-0 self-center">
                  <a
                    href={stored.blob_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-blue-light transition-colors p-1.5 rounded-md hover:bg-muted/40"
                    aria-label={`Bekijk ${stored.name}`}
                    title="Bekijken"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <a
                    href={stored.blob_url}
                    download={stored.name}
                    className="text-muted hover:text-blue-light transition-colors p-1.5 rounded-md hover:bg-muted/40"
                    aria-label={`Download ${stored.name}`}
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
  )
}
