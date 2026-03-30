export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { searchTenders, getMockTenders } from '@/lib/tenderned'
import type { TenderNedResult } from '@/lib/tenderned'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      query?: string
      category?: string
    }

    let results: TenderNedResult[]

    if (process.env.TENDERNED_API_KEY) {
      const response = await searchTenders({
        query: body.query,
        category: body.category,
        page_size: 20,
      })
      results = response.results
    } else {
      // Use mock data when API key is not configured
      results = getMockTenders()
    }

    let imported = 0
    let skipped = 0

    for (const tender of results) {
      try {
        await sql`
          INSERT INTO tenders (
            external_id, title, description, contracting_authority,
            deadline, publication_date, value, currency, category,
            source, url, cpv_codes, nuts_codes, procedure_type, status
          ) VALUES (
            ${tender.id},
            ${tender.title},
            ${tender.description},
            ${tender.contracting_authority},
            ${tender.deadline},
            ${tender.publication_date},
            ${tender.value ?? null},
            ${tender.currency},
            ${tender.category},
            'tenderned',
            ${tender.url},
            ${tender.cpv_codes},
            ${tender.nuts_codes},
            ${tender.procedure_type},
            'new'
          )
          ON CONFLICT (external_id) DO NOTHING
        `
        imported++
      } catch {
        skipped++
      }
    }

    return NextResponse.json({
      message: `Sync voltooid: ${imported} nieuw geïmporteerd, ${skipped} overgeslagen`,
      imported,
      skipped,
      total: results.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET redirect to sync page
export async function GET() {
  return NextResponse.redirect(
    new URL('/dashboard/tenders', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  )
}
