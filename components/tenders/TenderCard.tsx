import Link from 'next/link'
import { Calendar, Euro, Building2, ExternalLink, Paperclip } from 'lucide-react'
import { DeleteTenderButton } from '@/components/tenders/DeleteTenderButton'
import { Badge } from '@/components/ui/Badge'
import { ScoreRing } from '@/components/ui/ScoreRing'
import {
  formatCurrency,
  formatDateShort,
  daysUntil,
  statusToLabel,
  recommendationToLabel,
} from '@/lib/utils'
import type { Tender, Analysis } from '@/lib/db'

interface TenderCardProps {
  tender: Tender
  analysis?: Analysis | null
  /** Aantal gekoppelde documenten / bijlagen */
  attachmentCount?: number
}

function getStatusVariant(
  status: string
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
    new: 'info',
    in_progress: 'warning',
    analysed: 'neutral',
    bid: 'success',
    no_bid: 'danger',
    won: 'success',
    lost: 'danger',
  }
  return map[status] ?? 'neutral'
}

export function TenderCard({ tender, analysis, attachmentCount = 0 }: TenderCardProps) {
  const days = tender.deadline ? daysUntil(tender.deadline) : null
  const isUrgent = days !== null && days <= 7

  return (
    <div className="card hover:border-blue-light/30 transition-all duration-200 flex flex-col overflow-hidden group">
    <Link
      href={`/dashboard/tenders/${tender.id}`}
      className="p-5 flex flex-col gap-4 flex-1 min-w-0"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground font-grotesk line-clamp-2 group-hover:text-blue-light transition-colors">
            {tender.title}
          </h3>
          {tender.contracting_authority && (
            <div className="flex items-center gap-1.5 mt-1.5 text-muted text-sm">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{tender.contracting_authority}</span>
            </div>
          )}
        </div>
        {analysis?.score != null && (
          <ScoreRing score={analysis.score} size={56} strokeWidth={5} />
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-3 text-xs text-muted">
        {tender.deadline && (
          <div
            className={`flex items-center gap-1 ${isUrgent ? 'text-velocity-red' : ''}`}
          >
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {isUrgent && days !== null && days > 0
                ? `${days} dagen`
                : isUrgent && days === 0
                ? 'Vandaag!'
                : formatDateShort(tender.deadline)}
            </span>
          </div>
        )}
        {tender.value != null && (
          <div className="flex items-center gap-1">
            <Euro className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{formatCurrency(tender.value)}</span>
          </div>
        )}
        {tender.category && (
          <span className="text-muted">{tender.category}</span>
        )}
        <div className="flex items-center gap-1" title="Bijlagen">
          <Paperclip className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>
            {attachmentCount === 0
              ? 'Geen bijlagen'
              : attachmentCount === 1
                ? '1 bijlage'
                : `${attachmentCount} bijlagen`}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(tender.status)}>
            {statusToLabel(tender.status)}
          </Badge>
          {analysis?.recommendation && (
            <Badge
              variant={
                analysis.recommendation === 'bid'
                  ? 'success'
                  : analysis.recommendation === 'no_bid'
                  ? 'danger'
                  : 'warning'
              }
            >
              {recommendationToLabel(analysis.recommendation)}
            </Badge>
          )}
        </div>
        {tender.url && (
          <ExternalLink
            className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity"
            aria-hidden="true"
          />
        )}
      </div>
    </Link>
    <div className="flex justify-end border-t border-border-subtle/50 px-3 py-2 bg-surface/30">
      <DeleteTenderButton
        tenderId={tender.id}
        tenderTitle={tender.title}
        compact
      />
    </div>
    </div>
  )
}
