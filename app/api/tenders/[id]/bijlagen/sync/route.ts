export const dynamic = 'force-dynamic'
/** TenderNed kan veel bijlagen hebben; Hobby-plan: max 10s tenzij je maxDuration verhoogt. */
export const maxDuration = 120
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { syncTenderNedBijlagenToBlob } from '@/lib/syncTenderNedBijlagen'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenderRows = await sql`
    SELECT id, source, external_id FROM tenders WHERE id = ${params.id}
  `
  if (!tenderRows.length) {
    return NextResponse.json({ error: 'Tender niet gevonden' }, { status: 404 })
  }
  const tender = tenderRows[0] as {
    id: string
    source: string
    external_id: string | null
  }

  if (tender.source !== 'tenderned' || !tender.external_id) {
    return NextResponse.json(
      {
        error:
          'Alleen geïmporteerde TenderNed-tenders (met publicatie-id) kunnen worden gesynchroniseerd',
      },
      { status: 400 }
    )
  }

  const publicatieId = parseInt(String(tender.external_id), 10)
  if (!Number.isFinite(publicatieId) || publicatieId <= 0) {
    return NextResponse.json({ error: 'Ongeldige publicatie-id' }, { status: 400 })
  }

  try {
    const result = await syncTenderNedBijlagenToBlob({
      tenderId: tender.id,
      publicatieId,
    })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync mislukt'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
