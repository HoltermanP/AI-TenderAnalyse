export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { z } from 'zod'

const CreateLessonSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  outcome: z.enum(['positive', 'negative', 'neutral']).default('neutral'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  tender_id: z.string().uuid().optional(),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const outcome = searchParams.get('outcome')
  const category = searchParams.get('category')

  try {
    let query = 'SELECT * FROM lessons_learned'
    const params: string[] = []
    const conditions: string[] = []
    let idx = 1

    if (outcome) {
      conditions.push(`outcome = $${idx++}`)
      params.push(outcome)
    }
    if (category) {
      conditions.push(`category = $${idx++}`)
      params.push(category)
    }

    if (conditions.length) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    query += ' ORDER BY created_at DESC'

    const rows = await sql(query, params)
    return NextResponse.json(rows)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const data = CreateLessonSchema.parse(body)

    const rows = await sql`
      INSERT INTO lessons_learned (title, description, outcome, category, tags, tender_id)
      VALUES (
        ${data.title},
        ${data.description},
        ${data.outcome},
        ${data.category ?? null},
        ${data.tags ?? []},
        ${data.tender_id ?? null}
      )
      RETURNING *
    `

    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
