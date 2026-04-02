export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { Document } from '@/lib/db'

async function resolveTenderId(
  params: Promise<{ id: string }> | { id: string | string[] }
): Promise<string | null> {
  const p = await Promise.resolve(params)
  const raw = p?.id
  if (raw == null) return null
  const id = Array.isArray(raw) ? raw[0] : raw
  return id ? String(id) : null
}

/** Lijst documenten met status (polling tijdens analyse / sync) */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> | { id: string | string[] } }
) {
  try {
    const id = await resolveTenderId(ctx.params)
    if (!id) {
      return NextResponse.json({ error: 'Ongeldige tender-id' }, { status: 400 })
    }

    const exists = await sql`SELECT 1 FROM tenders WHERE id = ${id} LIMIT 1`
    if (!exists.length) {
      return NextResponse.json({ error: 'Tender niet gevonden' }, { status: 404 })
    }

    const rows = await sql`
      SELECT * FROM documents
      WHERE tender_id = ${id}
      ORDER BY created_at DESC
    `
    return NextResponse.json(rows as Document[])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
