export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await sql`DELETE FROM lessons_learned WHERE id = ${params.id}`
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await request.json()) as {
      title?: string
      description?: string
      outcome?: string
      category?: string
      tags?: string[]
    }

    const rows = await sql`
      UPDATE lessons_learned
      SET
        title = COALESCE(${body.title ?? null}, title),
        description = COALESCE(${body.description ?? null}, description),
        outcome = COALESCE(${body.outcome ?? null}, outcome),
        category = COALESCE(${body.category ?? null}, category),
        tags = COALESCE(${body.tags ?? null}, tags),
        updated_at = NOW()
      WHERE id = ${params.id}
      RETURNING *
    `

    if (!rows.length) {
      return NextResponse.json({ error: 'Lesson learned niet gevonden' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
