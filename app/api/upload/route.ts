export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { uploadFile, validateFile } from '@/lib/blob'
import { sql } from '@/lib/db'
import { summariseDocument } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const tenderId = formData.get('tenderId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Geen bestand meegestuurd' }, { status: 400 })
    }

    const validationError = validateFile(file)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Upload to Vercel Blob
    const folder = tenderId ? `tenders/${tenderId}` : 'uploads'
    const uploaded = await uploadFile(file, folder)

    // Try to get text content for summarization
    let summary: string | null = null
    if (file.type === 'text/plain') {
      try {
        const text = await file.text()
        if (text.length > 100) {
          summary = await summariseDocument(text.slice(0, 8000))
        }
      } catch {
        // Non-critical
      }
    }

    // Save to database
    const rows = await sql`
      INSERT INTO documents (tender_id, name, type, size, blob_url, summary)
      VALUES (
        ${tenderId ?? null},
        ${file.name},
        ${file.type},
        ${file.size},
        ${uploaded.url},
        ${summary}
      )
      RETURNING id, name, blob_url, created_at
    `

    return NextResponse.json(
      { ...rows[0], url: uploaded.url },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
