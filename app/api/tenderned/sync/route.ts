export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import {
  buildTnsListFilters,
  fetchPublicationsPage,
  getDefaultListPageSize,
  getMaxTendersPerImport,
  getPublicationAsTender,
  mapListItemToTender,
  useTendernedMock,
} from '@/lib/tenderned'
import type { TenderNedResult } from '@/lib/tenderned'

function parsePublicatieIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((x) => {
      if (typeof x === 'number') return x
      if (typeof x === 'string') return parseInt(x.trim(), 10)
      return NaN
    })
    .filter((n) => Number.isFinite(n) && n > 0)
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      publicatieIds?: unknown
      cpvCodes?: string | string[]
      search?: string
      /** Overschrijft env TENDERNED_IMPORT_MAX_TENDERS (1–500). */
      maxTenders?: number
      /** Zet op true om alle pagina’s van de (gefilterde) catalogus te importeren. */
      fullCatalog?: boolean
    }

    const listFilters = buildTnsListFilters({
      cpvCodes: body.cpvCodes,
      search: body.search,
    })

    const ids = parsePublicatieIds(body.publicatieIds)
    let results: TenderNedResult[] = []
    let totalPages = 0
    let totalElements = 0
    let pagesFetched = 0

    if (ids.length > 0) {
      const errors: { id: number; error: string }[] = []
      for (const id of ids) {
        try {
          results.push(await getPublicationAsTender(id))
        } catch (e) {
          errors.push({
            id,
            error: e instanceof Error ? e.message : 'Fout',
          })
        }
      }
      if (!results.length) {
        return NextResponse.json(
          { error: 'Geen publicaties opgehaald', details: errors },
          { status: 502 }
        )
      }
      totalPages = 1
      totalElements = results.length
      pagesFetched = 1
    } else {
      const pageSize = getDefaultListPageSize()
      const requestedCap =
        typeof body.maxTenders === 'number' && Number.isFinite(body.maxTenders)
          ? Math.floor(body.maxTenders)
          : getMaxTendersPerImport()
      const importCap = body.fullCatalog
        ? Number.MAX_SAFE_INTEGER
        : Math.min(Math.max(1, requestedCap), 500)

      let page = 0
      const maxPageIterations = body.fullCatalog ? 2000 : 50

      while (results.length < importCap && page < maxPageIterations) {
        const data = await fetchPublicationsPage(page, pageSize, listFilters)
        totalPages = data.totalPages
        totalElements = data.totalElements
        pagesFetched = page + 1

        const content = data.content ?? []
        for (const item of content) {
          if (results.length >= importCap) break
          results.push(mapListItemToTender(item))
        }

        if (
          data.last ||
          !content.length ||
          results.length >= importCap
        ) {
          break
        }
        page += 1
        if (useTendernedMock()) break
      }
    }

    let imported = 0
    let skipped = 0
    let firstInsertError: string | null = null

    for (const tender of results) {
      try {
        const inserted = await sql`
          INSERT INTO tenders (
            external_id, title, description, contracting_authority,
            deadline, publication_date, value, currency, category,
            source, url, cpv_codes, nuts_codes, procedure_type, status
          ) VALUES (
            ${tender.id},
            ${tender.title},
            ${tender.description},
            ${tender.contracting_authority},
            ${tender.deadline},
            ${tender.publication_date},
            ${tender.value ?? null},
            ${tender.currency},
            ${tender.category},
            'tenderned',
            ${tender.url},
            ${tender.cpv_codes},
            ${tender.nuts_codes},
            ${tender.procedure_type},
            'new'
          )
          ON CONFLICT (external_id) DO NOTHING
          RETURNING id
        `
        if (Array.isArray(inserted) && inserted.length > 0) imported++
        else skipped++
      } catch (e) {
        skipped++
        if (!firstInsertError) {
          firstInsertError = e instanceof Error ? e.message : String(e)
        }
      }
    }

    const catalogCap =
      ids.length > 0
        ? null
        : body.fullCatalog
          ? null
          : Math.min(
              Math.max(
                1,
                typeof body.maxTenders === 'number' &&
                  Number.isFinite(body.maxTenders)
                  ? Math.floor(body.maxTenders)
                  : getMaxTendersPerImport()
              ),
              500
            )

    const baseMsg = `Sync: ${imported} nieuw, ${skipped} overgeslagen (${results.length} uit catalogus gehaald)`
    const hint =
      imported === 0 &&
      skipped > 0 &&
      firstInsertError &&
      /does not exist|relation/i.test(firstInsertError)
        ? ' Voer lokaal `npm run db:migrate` uit (schema ontbreekt).'
        : ''

    return NextResponse.json({
      message: baseMsg + hint,
      imported,
      skipped,
      totalProcessed: results.length,
      ...(firstInsertError && imported === 0 && skipped === results.length
        ? { insertError: firstInsertError }
        : {}),
      pagesFetched,
      totalPages,
      totalElements,
      importCap: catalogCap,
      fullCatalog: !!body.fullCatalog && ids.length === 0,
      filters: listFilters ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.redirect(
    new URL(
      '/dashboard/tenders',
      process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    )
  )
}
