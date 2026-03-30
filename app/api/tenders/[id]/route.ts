export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { z } from 'zod'

const UpdateTenderSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  contracting_authority: z.string().optional(),
  deadline: z.string().optional(),
  value: z.coerce.number().positive().optional(),
  category: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  status: z
    .enum(['new', 'in_progress', 'analysed', 'bid', 'no_bid', 'won', 'lost'])
    .optional(),
  notes: z.string().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rows = await sql`
      SELECT t.*, a.score, a.recommendation, a.summary, a.win_probability
      FROM tenders t
      LEFT JOIN analyses a ON a.tender_id = t.id
      WHERE t.id = ${params.id}
    `

    if (!rows.length) {
      return NextResponse.json({ error: 'Tender niet gevonden' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
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
    const body: unknown = await request.json()
    const data = UpdateTenderSchema.parse(body)

    const sets: string[] = []
    const sqlParams: (string | number | null)[] = []
    let idx = 1

    if (data.title !== undefined) { sets.push(`title = $${idx++}`); sqlParams.push(data.title) }
    if (data.description !== undefined) { sets.push(`description = $${idx++}`); sqlParams.push(data.description) }
    if (data.contracting_authority !== undefined) { sets.push(`contracting_authority = $${idx++}`); sqlParams.push(data.contracting_authority) }
    if (data.deadline !== undefined) { sets.push(`deadline = $${idx++}`); sqlParams.push(data.deadline) }
    if (data.value !== undefined) { sets.push(`value = $${idx++}`); sqlParams.push(data.value) }
    if (data.category !== undefined) { sets.push(`category = $${idx++}`); sqlParams.push(data.category) }
    if (data.url !== undefined) { sets.push(`url = $${idx++}`); sqlParams.push(data.url || null) }
    if (data.status !== undefined) { sets.push(`status = $${idx++}`); sqlParams.push(data.status) }
    if (data.notes !== undefined) { sets.push(`notes = $${idx++}`); sqlParams.push(data.notes) }

    if (!sets.length) {
      return NextResponse.json({ error: 'Geen velden om bij te werken' }, { status: 400 })
    }

    sqlParams.push(params.id)

    const rows = await sql(
      `UPDATE tenders SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} RETURNING *`,
      sqlParams
    )

    if (!rows.length) {
      return NextResponse.json({ error: 'Tender niet gevonden' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await sql`DELETE FROM tenders WHERE id = ${params.id}`
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
