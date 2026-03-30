export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { deleteBlobUrls } from '@/lib/blob'
import { sql } from '@/lib/db'
import { z } from 'zod'
import { toneOfVoiceIdSchema } from '@/lib/toneOfVoice'

/** Next kan `params` als object of Promise leveren; `[id]` soms als string[]. */
async function resolveTenderId(
  params: Promise<{ id: string }> | { id: string | string[] }
): Promise<string | null> {
  const p = await Promise.resolve(params)
  const raw = p?.id
  if (raw == null) return null
  const id = Array.isArray(raw) ? raw[0] : raw
  return id ? String(id) : null
}

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
  tone_of_voice: toneOfVoiceIdSchema.optional(),
})

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> | { id: string | string[] } }
) {
  try {
    const id = await resolveTenderId(ctx.params)
    if (!id) {
      return NextResponse.json({ error: 'Ongeldige tender-id' }, { status: 400 })
    }
    const rows = await sql`
      SELECT t.*, la.score, la.recommendation, la.summary, la.win_probability
      FROM tenders t
      LEFT JOIN LATERAL (
        SELECT score, recommendation, summary, win_probability
        FROM analyses
        WHERE tender_id = t.id
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1
      ) la ON true
      WHERE t.id = ${id}
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
  ctx: { params: Promise<{ id: string }> | { id: string | string[] } }
) {
  try {
    const id = await resolveTenderId(ctx.params)
    if (!id) {
      return NextResponse.json({ error: 'Ongeldige tender-id' }, { status: 400 })
    }
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
    if (data.tone_of_voice !== undefined) {
      sets.push(`tone_of_voice = $${idx++}`)
      sqlParams.push(data.tone_of_voice)
    }

    if (!sets.length) {
      return NextResponse.json({ error: 'Geen velden om bij te werken' }, { status: 400 })
    }

    sqlParams.push(id)

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
  ctx: { params: Promise<{ id: string }> | { id: string | string[] } }
) {
  try {
    const id = await resolveTenderId(ctx.params)
    if (!id) {
      return NextResponse.json({ error: 'Ongeldige tender-id' }, { status: 400 })
    }

    const existing = (await sql`
      SELECT id FROM tenders WHERE id = ${id}
    `) as { id: string }[]
    if (!existing.length) {
      return NextResponse.json({ error: 'Tender niet gevonden' }, { status: 404 })
    }

    const docUrls = (await sql`
      SELECT blob_url FROM documents WHERE tender_id = ${id}
    `) as { blob_url: string }[]
    const pdfUrls = (await sql`
      SELECT blob_url FROM pdf_exports WHERE tender_id = ${id}
    `) as { blob_url: string }[]

    await deleteBlobUrls([
      ...docUrls.map((r) => r.blob_url),
      ...pdfUrls.map((r) => r.blob_url),
    ])

    // Volgorde: chat → analyses → bijlagen/exports → lessons → tender (robust bij afwijkende FK’s in DB)
    await sql`DELETE FROM chat_sessions WHERE tender_id = ${id}`
    await sql`DELETE FROM chat_messages WHERE tender_id = ${id}`
    await sql`DELETE FROM analyses WHERE tender_id = ${id}`
    await sql`DELETE FROM documents WHERE tender_id = ${id}`
    await sql`DELETE FROM pdf_exports WHERE tender_id = ${id}`
    await sql`DELETE FROM lessons_learned WHERE tender_id = ${id}`
    await sql`DELETE FROM tenders WHERE id = ${id}`

    revalidatePath('/dashboard/tenders')
    revalidatePath(`/dashboard/tenders/${id}`)
    revalidatePath('/dashboard')

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
