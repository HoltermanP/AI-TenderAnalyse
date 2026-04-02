export const dynamic = 'force-dynamic'
/** Zelfde plafond als analysis-prepare: ensureDocumentSummariesForTender + hoofd-AI kan lang duren bij veel bijlagen. */
export const maxDuration = 300
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { analyseTender, companyInfoFromDb } from '@/lib/anthropic'
import { getAnalysisDocumentCoverage } from '@/lib/analysisDocumentCoverage'
import {
  ensureCompanyDocumentSummaries,
  ensureDocumentSummariesForTender,
} from '@/lib/ensureDocumentSummaries'
import type { Tender, CompanyInfo, LessonLearned } from '@/lib/db'

function summaryIsUsableForAnalysis(summary: string | null | undefined): boolean {
  if (!summary) return false
  const trimmed = summary.trim()
  if (!trimmed) return false
  return !trimmed.startsWith('[')
}

/** Elke bijlage in de prompt, ook bij mislukte extractie of ontbrekende summary (anders “ziet” de AI ze niet). */
function summaryEntryForAnalysis(
  name: string,
  summary: string | null | undefined,
  onBlobSynced: boolean
): { name: string; summary: string } {
  if (!onBlobSynced) {
    return {
      name,
      summary:
        'Niet beschikbaar als volledige bijlage in opslag (sync mislukt of nog bezig). Zie documentdekking.',
    }
  }
  if (summary != null && summaryIsUsableForAnalysis(summary)) {
    return { name, summary }
  }
  const fallback = summary?.trim()
  if (fallback) {
    return {
      name,
      summary: `Automatische verwerking onvolledig. ${fallback}`,
    }
  }
  return {
    name,
    summary:
      'Nog geen samenvatting (bijv. timeout of verwerking niet afgerond). Raadpleeg het bestand zelf indien nodig.',
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenderId = searchParams.get('tenderId')

  if (!tenderId) {
    return NextResponse.json({ error: 'tenderId is verplicht' }, { status: 400 })
  }

  try {
    const rows = await sql`SELECT * FROM analyses WHERE tender_id = ${tenderId}`
    if (!rows.length) {
      return NextResponse.json(null)
    }
    return NextResponse.json(rows[0])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { tenderId: string }
    const { tenderId } = body

    if (!tenderId) {
      return NextResponse.json({ error: 'tenderId is verplicht' }, { status: 400 })
    }

    // Fetch tender
    const tenderRows = await sql`SELECT * FROM tenders WHERE id = ${tenderId}`
    if (!tenderRows.length) {
      return NextResponse.json({ error: 'Tender niet gevonden' }, { status: 404 })
    }
    const tender = tenderRows[0] as Tender

    /** Opnieuw vullen vóór de hoofd-prompt: alle bijlagen op Blob moeten een bruikbare samenvatting hebben. */
    await ensureCompanyDocumentSummaries()
    await ensureDocumentSummariesForTender(tenderId)

    // Fetch company info
    const companyRows =
      await sql`SELECT * FROM company_info ORDER BY updated_at DESC NULLS LAST LIMIT 1`
    const companyRow = (companyRows[0] as CompanyInfo | undefined) ?? {
      name: 'Mijn Bedrijf',
      description: '',
      strengths: [],
      certifications: [],
      sectors: [],
      cpv_focus: [],
    }

    // Fetch lessons learned
    const lessonsRows = await sql`
      SELECT title, description, outcome FROM lessons_learned
      ORDER BY created_at DESC LIMIT 10
    `
    const lessons = lessonsRows as Pick<LessonLearned, 'title' | 'description' | 'outcome'>[]

    const documentCoverage = await getAnalysisDocumentCoverage(
      tenderId,
      tender.tenderned_bijlagen_count ?? null
    )

    const docRows = (await sql`
      SELECT name, summary, blob_status, blob_url
      FROM documents
      WHERE tender_id = ${tenderId}
        AND source IN ('upload', 'tenderned')
      ORDER BY created_at ASC
    `) as {
      name: string
      summary: string | null
      blob_status: string
      blob_url: string | null
    }[]

    const companyDocRows = (await sql`
      SELECT name, summary, blob_status, blob_url
      FROM documents
      WHERE tender_id IS NULL AND source = 'company'
      ORDER BY created_at ASC
    `) as {
      name: string
      summary: string | null
      blob_status: string
      blob_url: string | null
    }[]

    const tenderSummariesForPrompt = docRows.map((d) =>
      summaryEntryForAnalysis(
        d.name,
        d.summary,
        d.blob_status === 'synced' && Boolean(d.blob_url)
      )
    )

    const companySummariesForPrompt = companyDocRows.map((d) =>
      summaryEntryForAnalysis(
        d.name,
        d.summary,
        d.blob_status === 'synced' && Boolean(d.blob_url)
      )
    )

    const result = await analyseTender({
      tender: {
        title: tender.title,
        description: tender.description ?? '',
        contracting_authority: tender.contracting_authority ?? 'Onbekend',
        deadline: tender.deadline ?? 'Onbekend',
        value: tender.value ?? undefined,
        category: tender.category ?? undefined,
        publication_date: tender.publication_date ?? null,
        currency: tender.currency ?? null,
        url: tender.url ?? null,
        external_id: tender.external_id ?? null,
        source: tender.source,
        tenderned_bijlagen_count: tender.tenderned_bijlagen_count ?? null,
      },
      companyInfo: companyInfoFromDb(companyRow),
      documentSummaries: tenderSummariesForPrompt,
      companyDocumentSummaries: companySummariesForPrompt,
      lessonsLearned: lessons.map(
        (l) => `[${l.outcome.toUpperCase()}] ${l.title}: ${l.description}`
      ),
      toneOfVoice: tender.tone_of_voice ?? null,
      documentCoverage,
    })

    // Save / update analysis
    const analysisRows = await sql`
      INSERT INTO analyses (
        tender_id, score, recommendation, summary,
        strengths, weaknesses, risks, opportunities,
        win_probability, effort_estimate
      ) VALUES (
        ${tenderId},
        ${result.score},
        ${result.recommendation},
        ${result.summary},
        ${result.strengths},
        ${result.weaknesses},
        ${result.risks},
        ${result.opportunities},
        ${result.win_probability},
        ${result.effort_estimate}
      )
      ON CONFLICT (tender_id) DO UPDATE SET
        score = EXCLUDED.score,
        recommendation = EXCLUDED.recommendation,
        summary = EXCLUDED.summary,
        strengths = EXCLUDED.strengths,
        weaknesses = EXCLUDED.weaknesses,
        risks = EXCLUDED.risks,
        opportunities = EXCLUDED.opportunities,
        win_probability = EXCLUDED.win_probability,
        effort_estimate = EXCLUDED.effort_estimate,
        updated_at = NOW()
      RETURNING *
    `

    // Update tender status to 'analysed'
    await sql`
      UPDATE tenders
      SET status = CASE WHEN status = 'new' THEN 'analysed' ELSE status END,
          updated_at = NOW()
      WHERE id = ${tenderId}
    `

    return NextResponse.json(analysisRows[0], { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analyse mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
