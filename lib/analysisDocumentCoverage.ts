import { sql } from '@/lib/db'

function hasUsableSummary(summary: string | null | undefined): boolean {
  if (!summary) return false
  const trimmed = summary.trim()
  if (!trimmed) return false
  return !trimmed.startsWith('[')
}

export type AnalysisDocumentCoverage = {
  /** TenderNed API: aantal in catalogus (kolom tenders) */
  catalogCount: number | null
  /** Rijen in documents voor deze tender */
  inAppTotal: number
  /** blob_status synced + blob_url */
  syncedBlob: number
  /** Bruikbare AI-samenvatting voor de hoofdanalyse */
  usableForAnalysis: number
  /** Korte regels voor de prompt (max ~15) */
  issueLines: string[]
}

/**
 * Feitelijke dekkingscijfers zodat de AI niet concludeert dat documenten "ontbreken"
 * terwijl ze wel in de TenderNed-lijst staan maar niet in de database zijn verwerkt.
 */
export async function getAnalysisDocumentCoverage(
  tenderId: string,
  tendernedCatalogCount: number | null
): Promise<AnalysisDocumentCoverage> {
  const rows = (await sql`
    SELECT name, source, blob_status, summary_status, summary
    FROM documents
    WHERE tender_id = ${tenderId}
  `) as {
    name: string
    source: string
    blob_status: string
    summary_status: string
    summary: string | null
  }[]

  let syncedBlob = 0
  let usableForAnalysis = 0
  const issueLines: string[] = []

  for (const r of rows) {
    if (r.blob_status === 'synced') syncedBlob++
    if (hasUsableSummary(r.summary)) usableForAnalysis++
    if (r.blob_status === 'failed') {
      issueLines.push(`${r.name}: niet opgeslagen op Blob (download/upload)`)
    } else if (
      r.blob_status === 'synced' &&
      (r.summary_status === 'failed' || (r.summary?.trim().startsWith('[') ?? false))
    ) {
      const short = (r.summary ?? '').trim().slice(0, 120)
      issueLines.push(`${r.name}: ${short || 'samenvatting mislukt'}`)
    }
  }

  const cap = 15
  const trimmedIssues = issueLines.slice(0, cap)
  if (issueLines.length > cap) {
    trimmedIssues.push(`… en ${issueLines.length - cap} verdere(s)`)
  }

  return {
    catalogCount: tendernedCatalogCount,
    inAppTotal: rows.length,
    syncedBlob,
    usableForAnalysis,
    issueLines: trimmedIssues,
  }
}
