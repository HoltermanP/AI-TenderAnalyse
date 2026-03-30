export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { uploadFile, validateFile } from '@/lib/blob'
import { sql } from '@/lib/db'
import {
  summariseCompanyProfileDocument,
  summariseDocument,
} from '@/lib/anthropic'
import { extractTextFromBuffer } from '@/lib/extractDocumentText'

const TEXT_SLICE = 24_000

async function summaryFromUploadedFile(
  file: File,
  kind: 'tender' | 'company'
): Promise<string | null> {
  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const raw = await extractTextFromBuffer(buf, file.type, file.name)
    if (!raw || raw.replace(/\s/g, '').length < 80) {
      if (file.type === 'text/plain') {
        const text = buf.toString('utf-8')
        if (text.length > 100) {
          const slice = text.length > TEXT_SLICE ? text.slice(0, TEXT_SLICE) : text
          return kind === 'company'
            ? await summariseCompanyProfileDocument(slice)
            : await summariseDocument(slice)
        }
      }
      return null
    }
    const slice = raw.length > TEXT_SLICE ? raw.slice(0, TEXT_SLICE) : raw
    return kind === 'company'
      ? await summariseCompanyProfileDocument(slice)
      : await summariseDocument(slice)
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const tenderIdRaw = formData.get('tenderId') as string | null
    const scope = formData.get('scope') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Geen bestand meegestuurd' }, { status: 400 })
    }

    const validationError = validateFile(file)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const isCompany = scope === 'company'
    const tenderId = isCompany ? null : tenderIdRaw?.trim() || null

    const folder = isCompany ? 'bedrijfsinfo' : tenderId ? `tenders/${tenderId}` : 'uploads'
    const uploaded = await uploadFile(file, folder)

    const summary = await summaryFromUploadedFile(
      file,
      isCompany ? 'company' : 'tender'
    )

    const source = isCompany ? 'company' : 'upload'

    const rows = await sql`
      INSERT INTO documents (tender_id, name, type, size, blob_url, summary, source)
      VALUES (
        ${tenderId},
        ${file.name},
        ${file.type},
        ${file.size},
        ${uploaded.url},
        ${summary},
        ${source}
      )
      RETURNING id, name, blob_url, created_at, summary
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
