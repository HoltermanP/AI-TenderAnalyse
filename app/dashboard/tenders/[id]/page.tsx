import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import type { Tender, Analysis, Document } from '@/lib/db'
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel'
import { FileUpload } from '@/components/upload/FileUpload'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import {
  formatCurrency,
  formatDate,
  daysUntil,
  statusToLabel,
} from '@/lib/utils'
import {
  Calendar,
  Euro,
  Building2,
  ExternalLink,
  Brain,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import { StartAnalysisButton } from '@/components/analysis/StartAnalysisButton'
import { TenderNedBijlagenToolbar } from '@/components/tenders/TenderNedBijlagenToolbar'
import { DeleteTenderButton } from '@/components/tenders/DeleteTenderButton'
import { AnalysisActionsToolbar } from '@/components/analysis/AnalysisActionsToolbar'
import { TenderDocumentsLiveSection } from '@/components/tenders/TenderDocumentsLiveSection'
import { TenderToneOfVoiceSelect } from '@/components/tenders/TenderToneOfVoiceSelect'
import {
  fetchPublicationDocumenten,
  type TnsPublicationDocument,
} from '@/lib/tenderned'
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
  let tnsDocuments: TnsPublicationDocument[] | null = null
  let tnsDocumentsError: string | null = null
  let mailEnabled = false

  try {
    const tRows = await sql`SELECT * FROM tenders WHERE id = ${params.id}`
    tender = (tRows[0] as Tender) ?? null

    if (!tender) notFound()

    const aRows = await sql`SELECT * FROM analyses WHERE tender_id = ${params.id}`
    analysis = (aRows[0] as Analysis) ?? null

    const dRows =
      await sql`SELECT * FROM documents WHERE tender_id = ${params.id} ORDER BY created_at DESC`
    documents = dRows as Document[]

    if (tender.source === 'tenderned' && tender.external_id) {
      const publicatieId = parseInt(String(tender.external_id), 10)
      if (Number.isFinite(publicatieId) && publicatieId > 0) {
        try {
          tnsDocuments = await fetchPublicationDocumenten(publicatieId, {
            cache: 'no-store',
          })
        } catch (e) {
          tnsDocumentsError =
            e instanceof Error ? e.message : 'Kon TenderNed-bijlagen niet laden'
        }
      }
    }
    try {
      const sRows = await sql`
        SELECT smtp_mail_enabled, smtp_host, smtp_from_email,
          (smtp_password IS NOT NULL AND smtp_password <> '') AS smtp_password_set
        FROM app_settings
        LIMIT 1
      `
      const s = sRows[0] as
        | {
            smtp_mail_enabled: boolean
            smtp_host: string | null
            smtp_from_email: string | null
            smtp_password_set: boolean
          }
        | undefined
      if (s) {
        mailEnabled =
          s.smtp_mail_enabled === true &&
          !!s.smtp_host?.trim() &&
          !!s.smtp_from_email?.trim() &&
          s.smtp_password_set === true
      }
    } catch {
      mailEnabled = false
    }
  } catch {
    notFound()
  }

  if (!tender) notFound()

  const days = tender.deadline ? daysUntil(tender.deadline) : null

  const showTenderNedCatalog = tnsDocuments !== null
  const manualDocuments = showTenderNedCatalog
    ? documents.filter((d) => d.source === 'upload')
    : documents

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/tenders"
        className="text-sm text-muted hover:text-foreground transition-colors"
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
          <h1 className="text-2xl font-bold font-grotesk text-foreground leading-tight">
            {tender.title}
          </h1>

          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted">
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

        <div className="flex flex-wrap items-center gap-2">
          {tender.url && (
            <a
              href={tender.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted hover:text-foreground border border-border-subtle hover:border-foreground/20 px-3 py-2 rounded-md transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Origineel
            </a>
          )}
          <DeleteTenderButton
            tenderId={tender.id}
            tenderTitle={tender.title}
            redirectTo="/dashboard/tenders"
          />
          <StartAnalysisButton tenderId={tender.id} hasAnalysis={!!analysis} />
        </div>
      </div>

      <TenderToneOfVoiceSelect
        tenderId={tender.id}
        initialTone={tender.tone_of_voice}
      />

      {/* Description */}
      {tender.description && (
        <Card>
          <CardHeader>
            <CardTitle>Beschrijving</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">
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
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <h2 className="text-lg font-semibold font-grotesk text-foreground flex items-center gap-2 shrink-0">
                    <Brain className="w-5 h-5 text-blue-light" />
                    AI Analyse
                  </h2>
                  <AnalysisActionsToolbar
                    tenderId={tender.id}
                    mailEnabled={mailEnabled}
                  />
                </div>
              </div>
              <AnalysisPanel analysis={analysis} />
            </div>
          ) : (
            <Card className="text-center py-10">
              <Brain className="w-12 h-12 text-muted mx-auto mb-3 opacity-40" />
              <p className="text-muted text-sm mb-4">
                Nog geen analyse beschikbaar
              </p>
              <StartAnalysisButton
                tenderId={tender.id}
                hasAnalysis={false}
                variant="cta"
              />
            </Card>
          )}

          {/* Bijlagen */}
          <div>
            <h2 className="text-lg font-semibold font-grotesk text-foreground mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-light" />
              Bijlagen
              {showTenderNedCatalog && tnsDocuments && (
                <span className="text-sm font-normal text-muted">
                  ({tnsDocuments.length} volgens TenderNed
                  {documents.length > 0 && (
                    <>
                      {' '}
                      · {documents.length} in app
                    </>
                  )}
                  )
                </span>
              )}
              {!showTenderNedCatalog && documents.length > 0 && (
                <span className="text-sm font-normal text-muted">
                  ({documents.length})
                </span>
              )}
            </h2>
            {showTenderNedCatalog && tender.source === 'tenderned' && (
              <p className="text-sm text-muted mb-4">
                Alle bijlagen van TenderNed staan hieronder met titel. Gebruik de knop om
                bestanden naar Blob te halen en lokaal te gebruiken.
              </p>
            )}

            {tnsDocumentsError && (
              <p className="text-sm text-velocity-red mb-4" role="alert">
                {tnsDocumentsError} — je kunt nog wel proberen te synchroniseren met de knop
                hieronder.
              </p>
            )}

            <TenderDocumentsLiveSection
              tenderId={tender.id}
              showTenderNedCatalog={showTenderNedCatalog}
              tnsDocuments={tnsDocuments}
              initialDocuments={documents}
              manualDocuments={manualDocuments}
            />

            <TenderNedBijlagenToolbar
              tenderId={tender.id}
              source={tender.source}
              externalId={tender.external_id}
              hasDocuments={documents.length > 0}
            />

            <FileUpload tenderId={tender.id} />
          </div>
        </div>

        {/* Chat sidebar */}
        <div className="card flex flex-col" style={{ minHeight: '500px', maxHeight: '700px' }}>
          <div className="p-4 border-b border-border-subtle">
            <h2 className="font-semibold text-foreground font-grotesk flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-light" />
              AI Chat
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Stel vragen over deze tender
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <ChatInterface
              tenderId={tender.id}
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
