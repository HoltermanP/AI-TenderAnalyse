export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { z } from 'zod'

async function resolveTenderId(
  params: Promise<{ tenderId: string }> | { tenderId: string | string[] }
): Promise<string | null> {
  const p = await Promise.resolve(params)
  const raw = p?.tenderId
  if (raw == null) return null
  const id = Array.isArray(raw) ? raw[0] : raw
  return id ? String(id) : null
}

const PatchSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  recommendation: z.enum(['bid', 'no_bid', 'review']).nullable().optional(),
  summary: z.string().nullable().optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  risks: z.array(z.string()).optional(),
  opportunities: z.array(z.string()).optional(),
  win_probability: z.number().min(0).max(100).nullable().optional(),
  effort_estimate: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ tenderId: string }> | { tenderId: string | string[] } }
) {
  try {
    const tenderId = await resolveTenderId(ctx.params)
    if (!tenderId) {
      return NextResponse.json({ error: 'Ongeldige tender-id' }, { status: 400 })
    }

    const existing = await sql`
      SELECT id FROM analyses WHERE tender_id = ${tenderId} LIMIT 1
    `
    if (!existing.length) {
      return NextResponse.json({ error: 'Geen analyse voor deze tender' }, { status: 404 })
    }

    const raw: unknown = await request.json()
    const data = PatchSchema.parse(raw)

    const sets: string[] = []
    const sqlParams: unknown[] = []
    let idx = 1

    if (data.score !== undefined) {
      sets.push(`score = $${idx++}`)
      sqlParams.push(data.score)
    }
    if (data.recommendation !== undefined) {
      sets.push(`recommendation = $${idx++}`)
      sqlParams.push(data.recommendation)
    }
    if (data.summary !== undefined) {
      sets.push(`summary = $${idx++}`)
      sqlParams.push(data.summary)
    }
    if (data.strengths !== undefined) {
      sets.push(`strengths = $${idx++}`)
      sqlParams.push(data.strengths)
    }
    if (data.weaknesses !== undefined) {
      sets.push(`weaknesses = $${idx++}`)
      sqlParams.push(data.weaknesses)
    }
    if (data.risks !== undefined) {
      sets.push(`risks = $${idx++}`)
      sqlParams.push(data.risks)
    }
    if (data.opportunities !== undefined) {
      sets.push(`opportunities = $${idx++}`)
      sqlParams.push(data.opportunities)
    }
    if (data.win_probability !== undefined) {
      sets.push(`win_probability = $${idx++}`)
      sqlParams.push(data.win_probability)
    }
    if (data.effort_estimate !== undefined) {
      sets.push(`effort_estimate = $${idx++}`)
      sqlParams.push(data.effort_estimate)
    }

    if (!sets.length) {
      return NextResponse.json({ error: 'Geen velden om bij te werken' }, { status: 400 })
    }

    sqlParams.push(tenderId)

    const rows = await sql(
      `UPDATE analyses SET ${sets.join(', ')}, updated_at = NOW()
       WHERE tender_id = $${idx} RETURNING *`,
      sqlParams
    )

    return NextResponse.json({ analysis: rows[0] })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? 'Ongeldige invoer' },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Bijwerken mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
