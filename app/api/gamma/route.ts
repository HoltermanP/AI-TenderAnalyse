export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { Tender, Analysis, CompanyInfo } from '@/lib/db'
import { createPresentation, buildTenderPresentation } from '@/lib/gamma'

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
    const analysis = analysisRows[0] as Analysis | undefined

    if (!analysis) {
      return NextResponse.json(
        { error: 'Voer eerst een analyse uit voordat je een presentatie maakt' },
        { status: 400 }
      )
    }

    const companyRows = await sql`SELECT name FROM company_info LIMIT 1`
    const companyName = ((companyRows[0] as { name?: string }) ?? {}).name ?? 'Mijn Bedrijf'

    const presentationInput = buildTenderPresentation(
      {
        title: tender.title,
        contracting_authority: tender.contracting_authority ?? 'Onbekend',
        value: tender.value ?? undefined,
        deadline: tender.deadline ?? 'Onbekend',
      },
      {
        score: analysis.score ?? 0,
        recommendation: analysis.recommendation ?? 'review',
        summary: analysis.summary ?? '',
        strengths: analysis.strengths ?? [],
        weaknesses: analysis.weaknesses ?? [],
        risks: analysis.risks ?? [],
        opportunities: analysis.opportunities ?? [],
        win_probability: analysis.win_probability ?? 0,
      },
      companyName
    )

    const result = await createPresentation(presentationInput)

    return NextResponse.json({ url: result.url, id: result.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Presentatie maken mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
