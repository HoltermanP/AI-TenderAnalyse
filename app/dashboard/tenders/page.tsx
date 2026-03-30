import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import type { Tender, Analysis } from '@/lib/db'
import { TenderCard } from '@/components/tenders/TenderCard'
import { TenderFilters } from '@/components/tenders/TenderFilters'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import Link from 'next/link'
import { AddTenderDialog } from '@/components/tenders/AddTenderDialog'
import { DeleteAllTendersDialog } from '@/components/tenders/DeleteAllTendersDialog'
import { TenderNedSyncDialog } from '@/components/tenders/TenderNedSyncDialog'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tenders',
}

interface TendersPageProps {
  searchParams: {
    q?: string
    status?: string
    rec?: string
    page?: string
  }
}

async function TendersList({ searchParams }: TendersPageProps) {
  const requestedPage = Math.max(1, Number(searchParams.page ?? 1))
  const limit = 12

  const conditions: string[] = []
  const params: (string | number)[] = []
  let paramIdx = 1

  if (searchParams.q) {
    conditions.push(
      `(t.title ILIKE $${paramIdx} OR t.description ILIKE $${paramIdx} OR t.contracting_authority ILIKE $${paramIdx})`
    )
    params.push(`%${searchParams.q}%`)
    paramIdx++
  }

  if (searchParams.status) {
    conditions.push(`t.status = $${paramIdx}`)
    params.push(searchParams.status)
    paramIdx++
  }

  if (searchParams.rec) {
    conditions.push(
      `EXISTS (SELECT 1 FROM analyses a2 WHERE a2.tender_id = t.id AND a2.recommendation = $${paramIdx})`
    )
    params.push(searchParams.rec)
    paramIdx++
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  let tenders: (Tender & {
    analysis_score?: number
    analysis_rec?: string
    attachment_count?: number
  })[] = []
  let total = 0

  try {
    const countRows = await sql(
      `SELECT COUNT(*)::int as count FROM tenders t ${where}`,
      params
    )
    total = Number((countRows[0] as { count: number }).count)
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[tenders] tellen mislukt:', err)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))
  if (requestedPage > totalPages && total > 0) {
    const p = new URLSearchParams()
    if (searchParams.q) p.set('q', searchParams.q)
    if (searchParams.status) p.set('status', searchParams.status)
    if (searchParams.rec) p.set('rec', searchParams.rec)
    p.set('page', String(totalPages))
    redirect(`/dashboard/tenders?${p.toString()}`)
  }

  const page = Math.min(requestedPage, totalPages)
  const offset = (page - 1) * limit

  const pageHref = (p: number) => {
    const q = new URLSearchParams()
    if (searchParams.q) q.set('q', searchParams.q)
    if (searchParams.status) q.set('status', searchParams.status)
    if (searchParams.rec) q.set('rec', searchParams.rec)
    if (p > 1) q.set('page', String(p))
    const s = q.toString()
    return s ? `/dashboard/tenders?${s}` : '/dashboard/tenders'
  }

  try {
    const rows = await sql(
      `SELECT t.*, la.score AS analysis_score, la.recommendation AS analysis_rec,
              COALESCE(
                t.tenderned_bijlagen_count,
                (SELECT COUNT(*)::int FROM documents d WHERE d.tender_id = t.id)
              ) AS attachment_count
       FROM tenders t
       LEFT JOIN LATERAL (
         SELECT score, recommendation
         FROM analyses
         WHERE tender_id = t.id
         ORDER BY created_at DESC NULLS LAST
         LIMIT 1
       ) la ON true
       ${where}
       ORDER BY t.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    )
    tenders = rows as typeof tenders
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[tenders] lijst laden mislukt:', err)
    }
  }

  return (
    <div className="space-y-4">
      {tenders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted text-sm mb-4">
            {searchParams.q || searchParams.status || searchParams.rec
              ? 'Geen tenders gevonden met deze filters'
              : total > 0
                ? 'Geen tenders op deze pagina — ga naar een eerdere pagina of wis het paginanummer in de URL.'
                : 'Nog geen tenders — voeg ze toe via TenderNed of handmatig'}
          </p>
          {total > 0 &&
            !(searchParams.q || searchParams.status || searchParams.rec) && (
              <Link
                href="/dashboard/tenders"
                className="text-sm text-ai-blue hover:underline"
              >
                Naar eerste pagina
              </Link>
            )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">
            {total} tender{total !== 1 ? 's' : ''} gevonden
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tenders.map((tender) => (
              <TenderCard
                key={tender.id}
                tender={tender}
                attachmentCount={Number(tender.attachment_count ?? 0)}
                analysis={
                  tender.analysis_score != null
                    ? ({
                        score: tender.analysis_score,
                        recommendation: tender.analysis_rec as Analysis['recommendation'],
                      } as Analysis)
                    : null
                }
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageHref(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${
                    p === page
                      ? 'bg-ai-blue text-white'
                      : 'text-muted hover:text-foreground hover:bg-surface'
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default async function TendersPage({ searchParams }: TendersPageProps) {
  let totalAllTenders = 0
  try {
    const rows = await sql`SELECT COUNT(*)::int as count FROM tenders`
    totalAllTenders = Number((rows[0] as { count: number }).count)
  } catch {
    // DB niet beschikbaar
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-grotesk text-foreground">
            Tenders
          </h1>
          <p className="text-muted text-sm mt-1">
            Beheer en analyseer al je tenders
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TenderNedSyncDialog />
          <AddTenderDialog />
          <DeleteAllTendersDialog totalCount={totalAllTenders} />
        </div>
      </div>

      {/* Filters */}
      <Suspense fallback={null}>
        <TenderFilters />
      </Suspense>

      {/* List */}
      <Suspense fallback={<PageLoader label="Tenders laden..." />}>
        <TendersList searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
