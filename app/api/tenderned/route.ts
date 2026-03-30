export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { searchTenders, getMockTenders } from '@/lib/tenderned'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? undefined
  const category = searchParams.get('category') ?? undefined

  try {
    if (process.env.TENDERNED_API_KEY) {
      const result = await searchTenders({ query, category, page_size: 20 })
      return NextResponse.json(result)
    }

    // Mock data when no API key
    const mock = getMockTenders()
    return NextResponse.json({ results: mock, total: mock.length, page: 1 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TenderNed fout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
