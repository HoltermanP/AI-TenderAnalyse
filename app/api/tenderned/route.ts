export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import {
  buildTnsListFilters,
  fetchPublicationsPage,
  getDefaultListPageSize,
  getPublicationAsTender,
  mapListItemToTender,
} from '@/lib/tenderned'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const publicatieIdRaw = searchParams.get('publicatieId')
  const pageRaw = searchParams.get('page')
  const sizeRaw = searchParams.get('size')
  const cpvRaw = searchParams.get('cpv')
  const qRaw = searchParams.get('q') ?? searchParams.get('search')

  try {
    if (publicatieIdRaw) {
      const publicatieId = Number(publicatieIdRaw)
      if (!Number.isFinite(publicatieId) || publicatieId <= 0) {
        return NextResponse.json(
          { error: 'Ongeldige publicatieId' },
          { status: 400 }
        )
      }
      const tender = await getPublicationAsTender(publicatieId)
      return NextResponse.json({
        results: [tender],
        total: 1,
        page: 0,
        totalPages: 1,
      })
    }

    const page = Math.max(0, Number(pageRaw ?? 0) || 0)
    const size = Math.min(
      100,
      Math.max(1, Number(sizeRaw ?? getDefaultListPageSize()) || 20)
    )

    const listFilters = buildTnsListFilters({
      cpvCodes: cpvRaw?.trim() ? cpvRaw : undefined,
      search: qRaw?.trim() ? qRaw : undefined,
    })

    const data = await fetchPublicationsPage(page, size, listFilters)
    const results = (data.content ?? []).map(mapListItemToTender)
    return NextResponse.json({
      results,
      page: data.number,
      totalPages: data.totalPages,
      totalElements: data.totalElements,
      size: data.size,
      filters: listFilters ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TenderNed fout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
