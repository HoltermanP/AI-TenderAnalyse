export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { z } from 'zod'

const CreateTenderSchema = z.object({
  title: z.string().min(1, 'Titel is verplicht').max(500),
  description: z.string().optional(),
  contracting_authority: z.string().optional(),
  deadline: z.string().optional(),
  value: z.coerce.number().positive().optional(),
  category: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  external_id: z.string().optional(),
  source: z.enum(['manual', 'tenderned', 'import']).default('manual'),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100)
  const offset = Number(searchParams.get('offset') ?? 0)
  const status = searchParams.get('status')
  const q = searchParams.get('q')

  try {
    let query = `
      SELECT t.id, t.title, t.contracting_authority, t.deadline, t.value, t.status, t.category, t.created_at
      FROM tenders t
    `
    const params: (string | number)[] = []
    const conditions: string[] = []
    let idx = 1

    if (status) {
      conditions.push(`t.status = $${idx++}`)
      params.push(status)
    }
    if (q) {
      conditions.push(`(t.title ILIKE $${idx} OR t.contracting_authority ILIKE $${idx})`)
      params.push(`%${q}%`)
      idx++
    }

    if (conditions.length) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    query += ` ORDER BY t.created_at DESC LIMIT ${limit} OFFSET ${offset}`

    const rows = await sql(query, params)

    return NextResponse.json({ tenders: rows })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const data = CreateTenderSchema.parse(body)

    const rows = await sql`
      INSERT INTO tenders (
        title, description, contracting_authority, deadline,
        value, category, url, external_id, source, status
      ) VALUES (
        ${data.title},
        ${data.description ?? null},
        ${data.contracting_authority ?? null},
        ${data.deadline ?? null},
        ${data.value ?? null},
        ${data.category ?? null},
        ${data.url ?? null},
        ${data.external_id ?? null},
        ${data.source},
        'new'
      )
      RETURNING *
    `

    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0].message },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
