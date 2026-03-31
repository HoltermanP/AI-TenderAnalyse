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
  'AI-TenderAnalyse/1.0 (TenderNed-bijlagen; openbare documenten)'

const FETCH_DOC_TIMEOUT_MS = 120_000

/** Twee gelijktijdige downloads om serverless-limieten te respecteren. */
const DOWNLOAD_CONCURRENCY = 2

function downloadSignal(): AbortSignal | undefined {
  if (
    typeof AbortSignal !== 'undefined' &&
    typeof AbortSignal.timeout === 'function'
  ) {
    return AbortSignal.timeout(FETCH_DOC_TIMEOUT_MS)
  }
  return undefined
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
  const href = doc.links?.download?.href
  if (!href) {
    return { kind: 'skipped' }
  }

  const existing = await sql`
    SELECT id FROM documents
    WHERE tender_id = ${tenderId} AND external_document_id = ${doc.documentId}
    LIMIT 1
  `
  if (existing.length > 0) {
    return { kind: 'skipped' }
  }

  const typeCode = doc.typeDocument?.code
  const fileName = buildDocumentFileName(naamFallback, typeCode)
  const mime = mimeTypeFromTnsDocumentType(typeCode)

  let buffer: Buffer
  try {
    const assetUrl = resolveTenderNedAssetUrl(href)
    const res = await fetch(assetUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': TENDERNED_DOWNLOAD_UA,
        Accept: '*/*',
      },
      signal: downloadSignal(),
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const ab = await res.arrayBuffer()
    buffer = Buffer.from(ab)
  } catch (e) {
    let message = e instanceof Error ? e.message : 'fetch mislukt'
    if (/aborted|AbortError|timeout/i.test(message)) {
      message = `Download timeout (${FETCH_DOC_TIMEOUT_MS / 1000}s) of verbinding verbroken`
    }
    return { kind: 'err', documentNaam: naamFallback, error: message }
  }

  if (buffer.length > TENDERNED_SYNC_MAX_BYTES) {
    return {
      kind: 'err',
      documentNaam: naamFallback,
      error: `Bestand groter dan ${Math.round(TENDERNED_SYNC_MAX_BYTES / (1024 * 1024))} MB`,
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
      INSERT INTO documents (
        tender_id, name, type, size, blob_url, source, external_document_id
      ) VALUES (
        ${tenderId},
        ${fileName},
        ${mime},
        ${uploaded.size},
        ${uploaded.url},
        'tenderned',
        ${doc.documentId}
      )
    `
    return { kind: 'added' }
  } catch (e) {
    return {
      kind: 'err',
      documentNaam: naamFallback,
      error: e instanceof Error ? e.message : 'upload mislukt',
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

  for (let i = 0; i < listed.length; i += DOWNLOAD_CONCURRENCY) {
    const batch = listed.slice(i, i + DOWNLOAD_CONCURRENCY)
    const outcomes = await Promise.all(
      batch.map((doc) => syncOneDocument(doc, tenderId))
    )
    for (const o of outcomes) {
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
