export const dynamic = 'force-dynamic'
/** Sync TenderNed + AI-samenvattingen kan minuten duren; apart van /api/analyse om timeouts te vermijden */
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import {
  ensureCompanyDocumentSummaries,
  ensureDocumentSummariesForTender,
} from '@/lib/ensureDocumentSummaries'
import { syncTenderNedBijlagenToBlob } from '@/lib/syncTenderNedBijlagen'
import type { Tender } from '@/lib/db'

async function resolveTenderId(
  params: Promise<{ id: string }> | { id: string | string[] }
): Promise<string | null> {
  const p = await Promise.resolve(params)
  const raw = p?.id
  if (raw == null) return null
  const id = Array.isArray(raw) ? raw[0] : raw
  return id ? String(id) : null
}

/**
 * Stap vóór /api/analyse: TenderNed → Blob, daarna samenvattingen voor alle bijlagen.
 * Los getrokken zodat Vercel/serverless niet één gigantische request hoeft af te ronden.
 */
export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> | { id: string | string[] } }
) {
  try {
    const tenderId = await resolveTenderId(ctx.params)
    if (!tenderId) {
      return NextResponse.json({ error: 'Ongeldige tender-id' }, { status: 400 })
    }

    const tenderRows = await sql`SELECT * FROM tenders WHERE id = ${tenderId}`
    if (!tenderRows.length) {
      return NextResponse.json({ error: 'Tender niet gevonden' }, { status: 404 })
    }
    const tender = tenderRows[0] as Tender

    if (tender.source === 'tenderned' && tender.external_id) {
      const publicatieId = parseInt(String(tender.external_id), 10)
      if (Number.isFinite(publicatieId) && publicatieId > 0) {
        const syncResult = await syncTenderNedBijlagenToBlob({
          tenderId,
          publicatieId,
        })
        await ensureCompanyDocumentSummaries()
        await ensureDocumentSummariesForTender(tenderId)
        return NextResponse.json({ ok: true as const, sync: syncResult })
      }
    }

    await ensureCompanyDocumentSummaries()
    await ensureDocumentSummariesForTender(tenderId)
    return NextResponse.json({ ok: true as const, sync: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Voorbereiden mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
