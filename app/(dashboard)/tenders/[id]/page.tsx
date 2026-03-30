import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import type { Tender, Analysis, Document } from '@/lib/db'
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel'
import { FileUpload } from '@/components/upload/FileUpload'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import {
  formatCurrency,
  formatDate,
  daysUntil,
  statusToLabel,
  fileTypeIcon,
  formatFileSize,
} from '@/lib/utils'
import {
  Calendar,
  Euro,
  Building2,
  ExternalLink,
  Brain,
  FileText,
  Download,
} from 'lucide-react'
import Link from 'next/link'
import { StartAnalysisButton } from '@/components/analysis/StartAnalysisButton'
import { GeneratePdfButton } from '@/components/pdf/GeneratePdfButton'
import type { Metadata } from 'next'

interface TenderDetailPageProps {
  params: { id: string }
}

export async function generateMetadata({
  params,
}: TenderDetailPageProps): Promise<Metadata> {
  try {
    const rows = await sql`SELECT title FROM tenders WHERE id = ${params.id}`
    const tender = rows[0] as { title: string } | undefined
    return { title: tender?.title ?? 'Tender' }
  } catch {
    return { title: 'Tender' }
  }
}

export default async function TenderDetailPage({
  params,
}: TenderDetailPageProps) {
  let tender: Tender | null = null
  let analysis: Analysis | null = null
  let documents: Document[] = []

  try {
    const tRows = await sql`SELECT * FROM tenders WHERE id = ${params.id}`
    tender = (tRows[0] as Tender) ?? null

    if (!tender) notFound()

    const aRows = await sql`SELECT * FROM analyses WHERE tender_id = ${params.id}`
    analysis = (aRows[0] as Analysis) ?? null

    const dRows =
      await sql`SELECT * FROM documents WHERE tender_id = ${params.id} ORDER BY created_at DESC`
    documents = dRows as Document[]
  } catch {
    notFound()
  }

  if (!tender) notFound()

  const days = tender.deadline ? daysUntil(tender.deadline) : null

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/tenders"
        className="text-sm text-slate-ai hover:text-off-white transition-colors"
      >
        ← Terug naar tenders
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant={tender.status === 'won' ? 'success' : tender.status === 'lost' ? 'danger' : 'info'}>
              {statusToLabel(tender.status)}
            </Badge>
            {tender.source === 'tenderned' && (
              <Badge variant="neutral">TenderNed</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold font-grotesk text-off-white leading-tight">
            {tender.title}
          </h1>

          <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-ai">
            {tender.contracting_authority && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>{tender.contracting_authority}</span>
              </div>
            )}
            {tender.deadline && (
              <div
                className={`flex items-center gap-1.5 ${days !== null && days <= 7 ? 'text-velocity-red' : ''}`}
              >
                <Calendar className="w-4 h-4" />
                <span>
                  {formatDate(tender.deadline)}
                  {days !== null && (
                    <span className="ml-1 text-xs">
                      ({days > 0 ? `${days} dagen` : days === 0 ? 'vandaag' : 'verlopen'})
                    </span>
                  )}
                </span>
              </div>
            )}
            {tender.value != null && (
              <div className="flex items-center gap-1.5">
                <Euro className="w-4 h-4" />
                <span>{formatCurrency(tender.value)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tender.url && (
            <a
              href={tender.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-slate-ai hover:text-off-white border border-border-subtle hover:border-off-white/20 px-3 py-2 rounded-md transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Origineel
            </a>
          )}
          <StartAnalysisButton tenderId={tender.id} hasAnalysis={!!analysis} />
          {analysis && <GeneratePdfButton tenderId={tender.id} />}
        </div>
      </div>

      {/* Description */}
      {tender.description && (
        <Card>
          <CardHeader>
            <CardTitle>Beschrijving</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-ai leading-relaxed whitespace-pre-wrap">
              {tender.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabs layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="xl:col-span-2 space-y-6">
          {/* Analysis */}
          {analysis ? (
            <div>
              <h2 className="text-lg font-semibold font-grotesk text-off-white mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-light" />
                AI Analyse
              </h2>
              <AnalysisPanel analysis={analysis} />
            </div>
          ) : (
            <Card className="text-center py-10">
              <Brain className="w-12 h-12 text-slate-ai mx-auto mb-3 opacity-40" />
              <p className="text-slate-ai text-sm mb-4">
                Nog geen analyse beschikbaar
              </p>
              <StartAnalysisButton
                tenderId={tender.id}
                hasAnalysis={false}
                variant="cta"
              />
            </Card>
          )}

          {/* Documents */}
          <div>
            <h2 className="text-lg font-semibold font-grotesk text-off-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-light" />
              Documenten
            </h2>
            <FileUpload tenderId={tender.id} />

            {documents.length > 0 && (
              <div className="mt-4 space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="card flex items-center gap-3 p-3">
                    <span className="text-lg">{fileTypeIcon(doc.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-off-white truncate">{doc.name}</p>
                      <p className="text-xs text-slate-ai">
                        {formatFileSize(doc.size)} · {formatDate(doc.created_at)}
                      </p>
                    </div>
                    <a
                      href={doc.blob_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-ai hover:text-blue-light transition-colors"
                      aria-label={`Download ${doc.name}`}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat sidebar */}
        <div className="card flex flex-col" style={{ minHeight: '500px', maxHeight: '700px' }}>
          <div className="p-4 border-b border-border-subtle">
            <h2 className="font-semibold text-off-white font-grotesk flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-light" />
              AI Chat
            </h2>
            <p className="text-xs text-slate-ai mt-0.5">
              Stel vragen over deze tender
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <ChatInterface
              tenderId={tender.id}
              placeholder={`Vraag iets over "${tender.title}"...`}
              initialContext={
                `Tender: ${tender.title}\n` +
                `Aanbestedende dienst: ${tender.contracting_authority ?? 'onbekend'}\n` +
                (tender.description ? `Beschrijving: ${tender.description}` : '')
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
