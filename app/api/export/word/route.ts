export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { Tender, Analysis, CompanyInfo } from '@/lib/db'
import { buildAnalysisDocxBuffer } from '@/lib/analysisDocx'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { tenderId: string }
    const { tenderId } = body

    if (!tenderId) {
      return NextResponse.json({ error: 'tenderId is verplicht' }, { status: 400 })
    }

    const tenderRows = await sql`SELECT * FROM tenders WHERE id = ${tenderId}`
    if (!tenderRows.length) {
      return NextResponse.json({ error: 'Tender niet gevonden' }, { status: 404 })
    }
    const tender = tenderRows[0] as Tender

    const analysisRows = await sql`SELECT * FROM analyses WHERE tender_id = ${tenderId}`
    const analysis = (analysisRows[0] as Analysis) ?? null

    const companyRows = await sql`SELECT * FROM company_info LIMIT 1`
    const company =
      (companyRows[0] as CompanyInfo) ??
      ({ name: 'Mijn Bedrijf' } as CompanyInfo)

    const generatedDate = new Date().toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const buffer = await buildAnalysisDocxBuffer({
      tender,
      analysis,
      company,
      generatedDate,
    })

    const safeName = `tender-analyse-${tender.id.slice(0, 8)}.docx`
    const encoded = encodeURIComponent(safeName)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encoded}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Word-export mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
