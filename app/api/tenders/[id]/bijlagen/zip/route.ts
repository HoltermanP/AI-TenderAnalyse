export const dynamic = 'force-dynamic'
export const maxDuration = 60
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import JSZip from 'jszip'

function slugForZipBasename(title: string): string {
  const s = title
    .slice(0, 80)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  return s || 'tender'
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenderRows =
    await sql`SELECT id, title FROM tenders WHERE id = ${params.id}`
  if (!tenderRows.length) {
    return NextResponse.json({ error: 'Tender niet gevonden' }, { status: 404 })
  }
  const tender = tenderRows[0] as { id: string; title: string }

  const docs = (await sql`
    SELECT name, blob_url FROM documents
    WHERE tender_id = ${params.id}
    ORDER BY created_at ASC
  `) as { name: string; blob_url: string }[]

  if (!docs.length) {
    return NextResponse.json(
      { error: 'Geen bijlagen om te downloaden' },
      { status: 404 }
    )
  }

  const zip = new JSZip()
  const used = new Map<string, number>()

  for (let i = 0; i < docs.length; i++) {
    const d = docs[i]
    let base = d.name.replace(/[/\\]/g, '-').trim() || `bestand-${i + 1}`
    const count = (used.get(base) ?? 0) + 1
    used.set(base, count)
    const entryName = count > 1 ? `${count}_${base}` : base

    try {
      const res = await fetch(d.blob_url)
      if (!res.ok) {
        zip.file(
          `FOUT_${entryName}.txt`,
          `Kon bestand niet laden (HTTP ${res.status}).`
        )
        continue
      }
      const buf = Buffer.from(await res.arrayBuffer())
      zip.file(entryName, buf)
    } catch {
      zip.file(`FOUT_${entryName}.txt`, 'Download van opslag mislukt.')
    }
  }

  const out = await zip.generateAsync({ type: 'nodebuffer' })
  const asciiName = `bijlagen-${slugForZipBasename(tender.title)}.zip`
  const encoded = encodeURIComponent(asciiName)

  return new NextResponse(new Uint8Array(out), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encoded}`,
      'Cache-Control': 'no-store',
    },
  })
}
