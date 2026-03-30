export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name, type, size, blob_url, summary, created_at
      FROM documents
      WHERE tender_id IS NULL AND source = 'company'
      ORDER BY created_at DESC
    `
    return NextResponse.json({ documents: rows })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
