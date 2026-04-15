import { getDownloadUrl } from '@vercel/blob'
import { sql } from '@/lib/db'
import type { Document } from '@/lib/db'
import {
  summariseCompanyPdfFromVision,
  summariseCompanyProfileDocument,
  summariseDocument,
  summariseTenderPdfFromVision,
} from '@/lib/anthropic'
import { extractTextFromBuffer, isPdfDocument } from '@/lib/extractDocumentText'

/** Ruim genoeg voor leidraad + PvE in één samenvatting-aanroep (na ZIP-samenvoeging). */
const TEXT_SLICE = 300_000
/** Parallelle AI-samenvattingen (sneller binnen serverless-limiet) */
const SUMMARY_CONCURRENCY = 5

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

  if (raw) {
    const slice = raw.length > TEXT_SLICE ? raw.slice(0, TEXT_SLICE) : raw
    try {
      summary = await summariseDocument(slice)
    } catch {
      summary = `[Samenvatting mislukt — bestand: ${doc.name}]`
    }
  } else if (isPdfDocument(buffer, doc.type, doc.name)) {
    try {
      summary = await summariseTenderPdfFromVision(buffer)
    } catch {
      summary = `[Geen leesbare tekst geëxtraheerd — bestand: ${doc.name} (${doc.type})]`
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

  for (let i = 0; i < pending.length; i += SUMMARY_CONCURRENCY) {
    const batch = pending.slice(i, i + SUMMARY_CONCURRENCY)
    await Promise.all(batch.map((doc) => summariseOneTenderDoc(doc)))
  }
}

async function summariseOneCompanyDoc(
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

  if (raw) {
    const slice = raw.length > TEXT_SLICE ? raw.slice(0, TEXT_SLICE) : raw
    try {
      summary = await summariseCompanyProfileDocument(slice)
    } catch {
      summary = `[Samenvatting mislukt — bestand: ${doc.name}]`
    }
  } else if (isPdfDocument(buffer, doc.type, doc.name)) {
    try {
      summary = await summariseCompanyPdfFromVision(buffer)
    } catch {
      summary = `[Geen leesbare tekst geëxtraheerd — bestand: ${doc.name} (${doc.type})]`
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

  const pending = docs.filter(
    (d) =>
      !hasUsableSummary(d.summary) &&
      d.blob_url &&
      d.blob_status === 'synced'
  )

  for (let i = 0; i < pending.length; i += SUMMARY_CONCURRENCY) {
    const batch = pending.slice(i, i + SUMMARY_CONCURRENCY)
    await Promise.all(batch.map((doc) => summariseOneCompanyDoc(doc)))
  }
}
