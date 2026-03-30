import { sql } from '@/lib/db'
import { uploadBuffer } from '@/lib/blob'
import {
  fetchPublicationDocumenten,
  mimeTypeFromTnsDocumentType,
  resolveTenderNedAssetUrl,
} from '@/lib/tenderned'

/** Ruimer dan handmatige upload: TenderNed-PDF’s kunnen groter zijn. */
export const TENDERNED_SYNC_MAX_BYTES = 50 * 1024 * 1024

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
  const listed = await fetchPublicationDocumenten(publicatieId)
  let added = 0
  let skipped = 0
  const errors: { documentNaam: string; error: string }[] = []

  for (const doc of listed) {
    const naamFallback = doc.documentNaam?.trim() || 'document'
    if (doc.virusIndicatie === true) {
      skipped++
      continue
    }
    const href = doc.links?.download?.href
    if (!href) {
      skipped++
      continue
    }

    const existing = await sql`
      SELECT id FROM documents
      WHERE tender_id = ${tenderId} AND external_document_id = ${doc.documentId}
      LIMIT 1
    `
    if (existing.length > 0) {
      skipped++
      continue
    }

    const typeCode = doc.typeDocument?.code
    const fileName = buildDocumentFileName(naamFallback, typeCode)
    const mime = mimeTypeFromTnsDocumentType(typeCode)

    let buffer: Buffer
    try {
      const assetUrl = resolveTenderNedAssetUrl(href)
      const res = await fetch(assetUrl, { redirect: 'follow' })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const ab = await res.arrayBuffer()
      buffer = Buffer.from(ab)
    } catch (e) {
      errors.push({
        documentNaam: naamFallback,
        error: e instanceof Error ? e.message : 'fetch mislukt',
      })
      continue
    }

    if (buffer.length > TENDERNED_SYNC_MAX_BYTES) {
      errors.push({
        documentNaam: naamFallback,
        error: `Bestand groter dan ${Math.round(TENDERNED_SYNC_MAX_BYTES / (1024 * 1024))} MB`,
      })
      continue
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
      added++
    } catch (e) {
      errors.push({
        documentNaam: naamFallback,
        error: e instanceof Error ? e.message : 'upload mislukt',
      })
    }
  }

  return {
    added,
    skipped,
    totalListed: listed.length,
    errors,
  }
}
