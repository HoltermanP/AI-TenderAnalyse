import { getDownloadUrl } from '@vercel/blob'
import { sql } from '@/lib/db'
import type { Document } from '@/lib/db'
import { summariseCompanyProfileDocument, summariseDocument } from '@/lib/anthropic'
import { extractTextFromBuffer } from '@/lib/extractDocumentText'

const TEXT_SLICE = 24_000
/** Parallelle AI-samenvattingen (sneller binnen serverless-limiet) */
const TENDER_SUMMARY_CONCURRENCY = 3

function hasUsableSummary(summary: string | null | undefined): boolean {
  if (!summary) return false
  const trimmed = summary.trim()
  if (!trimmed) return false
  return !trimmed.startsWith('[')
}

async function summariseOneTenderDoc(
  doc: Pick<Document, 'id' | 'name' | 'type' | 'blob_url' | 'summary' | 'blob_status'>
): Promise<void> {
  await sql`
    UPDATE documents SET summary_status = 'processing' WHERE id = ${doc.id}
  `

  let buffer: Buffer
  try {
    const res = await fetch(getDownloadUrl(doc.blob_url!), {
      redirect: 'follow',
    })
    if (!res.ok) {
      await sql`
        UPDATE documents
        SET summary = ${`[Blob niet bereikbaar (HTTP ${res.status}) — ${doc.name}]`},
            summary_status = 'failed'
        WHERE id = ${doc.id}
      `
      return
    }
    const ab = await res.arrayBuffer()
    buffer = Buffer.from(ab)
  } catch {
    await sql`
      UPDATE documents
      SET summary = ${`[Download van blob mislukt — ${doc.name}]`},
          summary_status = 'failed'
      WHERE id = ${doc.id}
    `
    return
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

  const summaryOk = hasUsableSummary(summary)
  await sql`
    UPDATE documents
    SET summary = ${summary},
        summary_status = ${summaryOk ? 'done' : 'failed'}
    WHERE id = ${doc.id}
  `
}

/**
 * Zorgt dat elke bijlage op de blob een samenvatting heeft (voor analyse).
 * Ontbrekende summaries worden ingevuld via download + tekstextractie + AI.
 */
export async function ensureDocumentSummariesForTender(tenderId: string): Promise<void> {
  const rows = await sql`
    SELECT id, name, type, blob_url, summary, blob_status
    FROM documents
    WHERE tender_id = ${tenderId}
  `
  const docs = rows as Pick<
    Document,
    'id' | 'name' | 'type' | 'blob_url' | 'summary' | 'blob_status'
  >[]

  const pending = docs.filter(
    (d) =>
      !hasUsableSummary(d.summary) &&
      d.blob_url &&
      d.blob_status === 'synced'
  )

  for (let i = 0; i < pending.length; i += TENDER_SUMMARY_CONCURRENCY) {
    const batch = pending.slice(i, i + TENDER_SUMMARY_CONCURRENCY)
    await Promise.all(batch.map((doc) => summariseOneTenderDoc(doc)))
  }
}

/**
 * Vult ontbrekende samenvattingen voor handmatige bedrijfsdocumenten (source = company).
 */
export async function ensureCompanyDocumentSummaries(): Promise<void> {
  const rows = await sql`
    SELECT id, name, type, blob_url, summary, blob_status
    FROM documents
    WHERE tender_id IS NULL AND source = 'company'
  `
  const docs = rows as Pick<
    Document,
    'id' | 'name' | 'type' | 'blob_url' | 'summary' | 'blob_status'
  >[]

  for (const doc of docs) {
    if (hasUsableSummary(doc.summary)) continue
    if (!doc.blob_url || doc.blob_status !== 'synced') continue

    await sql`
      UPDATE documents SET summary_status = 'processing' WHERE id = ${doc.id}
    `

    let buffer: Buffer
    try {
      const res = await fetch(getDownloadUrl(doc.blob_url), {
        redirect: 'follow',
      })
      if (!res.ok) {
        await sql`
          UPDATE documents SET summary_status = 'failed' WHERE id = ${doc.id}
        `
        continue
      }
      const ab = await res.arrayBuffer()
      buffer = Buffer.from(ab)
    } catch {
      await sql`
        UPDATE documents SET summary_status = 'failed' WHERE id = ${doc.id}
      `
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

    const summaryOk = hasUsableSummary(summary)
    await sql`
      UPDATE documents
      SET summary = ${summary},
          summary_status = ${summaryOk ? 'done' : 'failed'}
      WHERE id = ${doc.id}
    `
  }
}
