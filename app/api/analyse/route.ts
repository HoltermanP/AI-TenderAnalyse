export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { analyseTender, companyInfoFromDb } from '@/lib/anthropic'
import {
  ensureCompanyDocumentSummaries,
  ensureDocumentSummariesForTender,
} from '@/lib/ensureDocumentSummaries'
import { syncTenderNedBijlagenToBlob } from '@/lib/syncTenderNedBijlagen'
import type { Tender, CompanyInfo, LessonLearned } from '@/lib/db'

function hasUsableSummary(summary: string | null | undefined): summary is string {
  if (!summary) return false
  const trimmed = summary.trim()
  if (!trimmed) return false
  return !trimmed.startsWith('[')
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

    // Voor TenderNed: als er nog geen blob-documenten gekoppeld zijn,
    // probeer automatisch een sync zodat analyse de kernbijlagen kan meenemen.
    if (tender.source === 'tenderned' && tender.external_id) {
      const existingDocsRows = await sql`
        SELECT COUNT(*)::int AS count
        FROM documents
        WHERE tender_id = ${tenderId}
      `
      const existingDocs = Number(
        (existingDocsRows[0] as { count?: number | string } | undefined)?.count ?? 0
      )
      if (existingDocs === 0) {
        const publicatieId = parseInt(String(tender.external_id), 10)
        if (Number.isFinite(publicatieId) && publicatieId > 0) {
          try {
            await syncTenderNedBijlagenToBlob({ tenderId, publicatieId })
          } catch {
            // Analyse kan nog steeds doorgaan op tendertekst; foutafhandeling volgt later.
          }
        }
      }
    }

    // Fetch company info
    const companyRows = await sql`SELECT * FROM company_info LIMIT 1`
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

    await ensureCompanyDocumentSummaries()
    await ensureDocumentSummariesForTender(tenderId)

    const docRows = await sql`
      SELECT name, summary FROM documents
      WHERE tender_id = ${tenderId} AND summary IS NOT NULL AND TRIM(summary) <> ''
    `

    const companyDocRows = await sql`
      SELECT name, summary FROM documents
      WHERE tender_id IS NULL AND source = 'company'
        AND summary IS NOT NULL AND TRIM(summary) <> ''
    `

    // Run AI analysis
    const usableTenderDocs = (docRows as { name: string; summary: string }[]).filter((d) =>
      hasUsableSummary(d.summary)
    )
    const usableCompanyDocs = (companyDocRows as { name: string; summary: string }[]).filter((d) =>
      hasUsableSummary(d.summary)
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
      documentSummaries: usableTenderDocs.map((d) => ({
        name: d.name,
        summary: d.summary,
      })),
      companyDocumentSummaries: usableCompanyDocs.map((d) => ({
        name: d.name,
        summary: d.summary,
      })),
      lessonsLearned: lessons.map(
        (l) => `[${l.outcome.toUpperCase()}] ${l.title}: ${l.description}`
      ),
      toneOfVoice: tender.tone_of_voice ?? null,
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
