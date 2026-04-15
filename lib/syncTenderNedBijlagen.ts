import { sql } from '@/lib/db'
import { uploadBuffer, assertBlobWriteToken } from '@/lib/blob'
import {
  fetchPublicationDocumenten,
  mimeTypeFromTnsDocumentType,
  resolveTenderNedAssetUrl,
  type TnsPublicationDocument,
} from '@/lib/tenderned'

/** Ruimer dan handmatige upload: TenderNed-PDF’s kunnen groter zijn. */
export const TENDERNED_SYNC_MAX_BYTES = 50 * 1024 * 1024

const TENDERNED_DOWNLOAD_UA =
  'Mozilla/5.0 (compatible; AI-TenderAnalyse/1.0; +https://www.tenderned.nl)'

const FETCH_DOC_TIMEOUT_MS = 120_000

function downloadSignal(): AbortSignal | undefined {
  if (
    typeof AbortSignal !== 'undefined' &&
    typeof AbortSignal.timeout === 'function'
  ) {
    return AbortSignal.timeout(FETCH_DOC_TIMEOUT_MS)
  }
  return undefined
}

function getDownloadHref(doc: TnsPublicationDocument): string | null {
  const href = doc.links?.download?.href?.trim()
  return href || null
}

async function downloadTenderNedBinary(
  assetUrl: string
): Promise<{ buffer: Buffer } | { error: string }> {
  const headers: Record<string, string> = {
    'User-Agent': TENDERNED_DOWNLOAD_UA,
    Accept: 'application/pdf,application/zip,application/msword,application/vnd.openxmlformats-officedocument.*,*/*;q=0.8',
    'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    Referer: 'https://www.tenderned.nl/',
  }

  let lastErr = 'Download mislukt'
  const maxAttempts = 5

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 600 * attempt))
    }
    try {
      const res = await fetch(assetUrl, {
        redirect: 'follow',
        headers,
        signal: downloadSignal(),
      })
      if (res.ok) {
        const ab = await res.arrayBuffer()
        return { buffer: Buffer.from(ab) }
      }
      lastErr = `HTTP ${res.status}`
      // Retry op server-/rate-limit-fouten en 404 (document soms nog niet gereed bij TenderNed)
      if (res.status === 429 || res.status === 404 || res.status >= 500) {
        continue
      }
      return { error: lastErr }
    } catch (e) {
      let message = e instanceof Error ? e.message : 'fetch mislukt'
      if (/aborted|AbortError|timeout/i.test(message)) {
        return {
          error: `Download timeout (${FETCH_DOC_TIMEOUT_MS / 1000}s) of verbinding verbroken`,
        }
      }
      lastErr = message
    }
  }

  return { error: lastErr }
}

export function buildDocumentFileName(
  documentNaam: string,
  typeCode: string | undefined
): string {
  const rawExt = (typeCode ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const ext = rawExt || 'bin'
  const base = documentNaam.trim().replace(/[/\\]/g, '-').slice(0, 450)
  const lower = base.toLowerCase()
  if (lower.endsWith(`.${ext}`)) return base.slice(0, 500)
  return `${base}.${ext}`.slice(0, 500)
}

type OneDocResult =
  | { kind: 'added' }
  | { kind: 'skipped' }
  | { kind: 'err'; documentNaam: string; error: string }

async function syncOneDocument(
  doc: TnsPublicationDocument,
  tenderId: string
): Promise<OneDocResult> {
  const naamFallback = doc.documentNaam?.trim() || 'document'
  if (doc.virusIndicatie === true) {
    return { kind: 'skipped' }
  }

  const externalId =
    doc.documentId != null ? String(doc.documentId).trim() : ''
  if (!externalId) {
    return { kind: 'skipped' }
  }

  const href = getDownloadHref(doc)
  if (!href) {
    return { kind: 'skipped' }
  }

  const typeCode = doc.typeDocument?.code
  const fileName = buildDocumentFileName(naamFallback, typeCode)
  const mime = mimeTypeFromTnsDocumentType(typeCode)

  const existingRows = await sql`
    SELECT id, blob_url, blob_status FROM documents
    WHERE tender_id = ${tenderId} AND external_document_id = ${externalId}
    LIMIT 1
  `
  let docId: string
  if (existingRows.length > 0) {
    const ex = existingRows[0] as {
      id: string
      blob_url: string | null
      blob_status: string
    }
    if (ex.blob_url && ex.blob_status === 'synced') {
      return { kind: 'skipped' }
    }
    docId = ex.id
    await sql`
      UPDATE documents
      SET blob_status = 'downloading', name = ${fileName}, type = ${mime}
      WHERE id = ${docId}
    `
  } else {
    const inserted = await sql`
      INSERT INTO documents (
        tender_id, name, type, size, blob_url, source, external_document_id,
        blob_status, summary_status
      ) VALUES (
        ${tenderId},
        ${fileName},
        ${mime},
        ${0},
        ${null},
        'tenderned',
        ${externalId},
        'downloading',
        'pending'
      )
      RETURNING id
    `
    docId = (inserted[0] as { id: string }).id
  }

  const assetUrl = resolveTenderNedAssetUrl(href)
  const dl = await downloadTenderNedBinary(assetUrl)
  if ('error' in dl) {
    await sql`
      UPDATE documents
      SET blob_status = 'failed',
          summary = ${`[Download mislukt: ${dl.error} — ${fileName}]`},
          summary_status = 'failed'
      WHERE id = ${docId}
    `
    return { kind: 'err', documentNaam: naamFallback, error: dl.error }
  }
  const buffer = dl.buffer

  if (buffer.length > TENDERNED_SYNC_MAX_BYTES) {
    const errText = `Bestand groter dan ${Math.round(TENDERNED_SYNC_MAX_BYTES / (1024 * 1024))} MB`
    await sql`
      UPDATE documents
      SET blob_status = 'failed',
          summary = ${`[${errText} — ${fileName}]`},
          summary_status = 'failed'
      WHERE id = ${docId}
    `
    return {
      kind: 'err',
      documentNaam: naamFallback,
      error: errText,
    }
  }

  try {
    const safePathName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uploaded = await uploadBuffer(
      buffer,
      safePathName,
      mime,
      `tenders/${tenderId}/tenderned`
    )

    await sql`
      UPDATE documents
      SET blob_url = ${uploaded.url},
          size = ${uploaded.size},
          blob_status = 'synced',
          summary = ${null},
          summary_status = 'pending'
      WHERE id = ${docId}
    `
    return { kind: 'added' }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'upload mislukt'
    await sql`
      UPDATE documents
      SET blob_status = 'failed',
          summary = ${`[Upload naar opslag mislukt: ${message} — ${fileName}]`},
          summary_status = 'failed'
      WHERE id = ${docId}
    `
    return {
      kind: 'err',
      documentNaam: naamFallback,
      error: message,
    }
  }
}

export async function syncTenderNedBijlagenToBlob(input: {
  tenderId: string
  publicatieId: number
}): Promise<{
  added: number
  skipped: number
  totalListed: number
  errors: { documentNaam: string; error: string }[]
}> {
  const { tenderId, publicatieId } = input
  assertBlobWriteToken()

  /**
   * Reset documenten die in een vorige (getimede-out) run op 'downloading' zijn blijven staan.
   * Zonder reset worden ze in syncOneDocument overgeslagen omdat ze al een status hebben,
   * maar ze zijn niet gesynchroniseerd → analyse mist ze.
   */
  await sql`
    UPDATE documents
    SET blob_status = 'failed',
        summary = '[Vorige downloadpoging niet voltooid — wordt opnieuw geprobeerd]',
        summary_status = 'failed'
    WHERE tender_id = ${tenderId}
      AND blob_status = 'downloading'
  `

  const listed = await fetchPublicationDocumenten(publicatieId, {
    cache: 'no-store',
  })

  await sql`
    UPDATE tenders
    SET tenderned_bijlagen_count = ${listed.length}, updated_at = NOW()
    WHERE id = ${tenderId}
  `

  let added = 0
  let skipped = 0
  const errors: { documentNaam: string; error: string }[] = []

  /** Parallelle downloads (max 3 gelijktijdig om TenderNed niet te overbelasten en OOM te voorkomen). */
  const SYNC_CONCURRENCY = 3
  for (let i = 0; i < listed.length; i += SYNC_CONCURRENCY) {
    const batch = listed.slice(i, i + SYNC_CONCURRENCY)
    const results = await Promise.all(batch.map((d) => syncOneDocument(d, tenderId)))
    for (const o of results) {
      if (o.kind === 'added') added++
      else if (o.kind === 'skipped') skipped++
      else errors.push({ documentNaam: o.documentNaam, error: o.error })
    }
  }

  return {
    added,
    skipped,
    totalListed: listed.length,
    errors,
  }
}
