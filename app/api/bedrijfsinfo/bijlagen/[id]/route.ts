export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { deleteFile } from '@/lib/blob'
import { sql } from '@/lib/db'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rows = await sql`
      SELECT id, blob_url FROM documents
      WHERE id = ${params.id} AND tender_id IS NULL AND source = 'company'
      LIMIT 1
    `
    if (!rows.length) {
      return NextResponse.json({ error: 'Document niet gevonden' }, { status: 404 })
    }
    const doc = rows[0] as { id: string; blob_url: string }
    try {
      await deleteFile(doc.blob_url)
    } catch {
      // Blob kan al weg zijn; DB-record wel verwijderen
    }
    await sql`DELETE FROM documents WHERE id = ${params.id}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verwijderen mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
