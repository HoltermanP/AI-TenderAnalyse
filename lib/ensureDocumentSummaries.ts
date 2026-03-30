import { sql } from '@/lib/db'
import type { Document } from '@/lib/db'
import { summariseCompanyProfileDocument, summariseDocument } from '@/lib/anthropic'
import { extractTextFromBuffer } from '@/lib/extractDocumentText'

const TEXT_SLICE = 24_000

/**
 * Zorgt dat elke bijlage op de blob een samenvatting heeft (voor analyse).
 * Ontbrekende summaries worden ingevuld via download + tekstextractie + AI.
 */
export async function ensureDocumentSummariesForTender(tenderId: string): Promise<void> {
  const rows = await sql`
    SELECT id, name, type, blob_url, summary
    FROM documents
    WHERE tender_id = ${tenderId}
  `
  const docs = rows as Pick<Document, 'id' | 'name' | 'type' | 'blob_url' | 'summary'>[]

  for (const doc of docs) {
    if (doc.summary?.trim()) continue
    if (!doc.blob_url) continue

    let buffer: Buffer
    try {
      const res = await fetch(doc.blob_url, { redirect: 'follow' })
      if (!res.ok) {
        await sql`
          UPDATE documents
          SET summary = ${`[Blob niet bereikbaar (HTTP ${res.status}) — ${doc.name}]`}
          WHERE id = ${doc.id}
        `
        continue
      }
      const ab = await res.arrayBuffer()
      buffer = Buffer.from(ab)
    } catch {
      await sql`
        UPDATE documents
        SET summary = ${`[Download van blob mislukt — ${doc.name}]`}
        WHERE id = ${doc.id}
      `
      continue
    }

    const raw = await extractTextFromBuffer(buffer, doc.type, doc.name)
    let summary: string

    if (raw && raw.replace(/\s/g, '').length > 80) {
      const slice = raw.length > TEXT_SLICE ? raw.slice(0, TEXT_SLICE) : raw
      try {
        summary = await summariseDocument(slice)
      } catch {
        summary = `[Samenvatting mislukt — bestand: ${doc.name}]`
      }
    } else {
      summary = `[Geen leesbare tekst geëxtraheerd — bestand: ${doc.name} (${doc.type})]`
    }

    await sql`
      UPDATE documents
      SET summary = ${summary}
      WHERE id = ${doc.id}
    `
  }
}

/**
 * Vult ontbrekende samenvattingen voor handmatige bedrijfsdocumenten (source = company).
 */
export async function ensureCompanyDocumentSummaries(): Promise<void> {
  const rows = await sql`
    SELECT id, name, type, blob_url, summary
    FROM documents
    WHERE tender_id IS NULL AND source = 'company'
  `
  const docs = rows as Pick<Document, 'id' | 'name' | 'type' | 'blob_url' | 'summary'>[]

  for (const doc of docs) {
    if (doc.summary?.trim()) continue
    if (!doc.blob_url) continue

    let buffer: Buffer
    try {
      const res = await fetch(doc.blob_url, { redirect: 'follow' })
      if (!res.ok) continue
      const ab = await res.arrayBuffer()
      buffer = Buffer.from(ab)
    } catch {
      continue
    }

    const raw = await extractTextFromBuffer(buffer, doc.type, doc.name)
    let summary: string

    if (raw && raw.replace(/\s/g, '').length > 80) {
      const slice = raw.length > TEXT_SLICE ? raw.slice(0, TEXT_SLICE) : raw
      try {
        summary = await summariseCompanyProfileDocument(slice)
      } catch {
        summary = `[Samenvatting mislukt — bestand: ${doc.name}]`
      }
    } else {
      summary = `[Geen leesbare tekst geëxtraheerd — bestand: ${doc.name} (${doc.type})]`
    }

    await sql`
      UPDATE documents
      SET summary = ${summary}
      WHERE id = ${doc.id}
    `
  }
}
