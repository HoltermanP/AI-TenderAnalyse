export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { analyseTender } from '@/lib/anthropic'
import type { Tender, CompanyInfo, LessonLearned } from '@/lib/db'

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

    // Fetch company info
    const companyRows = await sql`SELECT * FROM company_info LIMIT 1`
    const company = (companyRows[0] as CompanyInfo | undefined) ?? {
      name: 'Mijn Bedrijf',
      description: '',
      strengths: [],
      certifications: [],
      sectors: [],
    }

    // Fetch lessons learned
    const lessonsRows = await sql`
      SELECT title, description, outcome FROM lessons_learned
      ORDER BY created_at DESC LIMIT 10
    `
    const lessons = lessonsRows as Pick<LessonLearned, 'title' | 'description' | 'outcome'>[]

    // Fetch document summaries if available
    const docRows = await sql`
      SELECT name, summary FROM documents
      WHERE tender_id = ${tenderId} AND summary IS NOT NULL
    `

    // Run AI analysis
    const result = await analyseTender({
      tender: {
        title: tender.title,
        description: tender.description ?? '',
        contracting_authority: tender.contracting_authority ?? 'Onbekend',
        deadline: tender.deadline ?? 'Onbekend',
        value: tender.value ?? undefined,
        category: tender.category ?? undefined,
      },
      companyInfo: {
        name: company.name,
        description: company.description ?? '',
        strengths: company.strengths ?? [],
        certifications: company.certifications ?? [],
        sectors: company.sectors ?? [],
      },
      documents: (docRows as { summary: string }[]).map((d) => d.summary),
      lessonsLearned: lessons.map(
        (l) => `[${l.outcome.toUpperCase()}] ${l.title}: ${l.description}`
      ),
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
