import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import type { Tender, Analysis } from '@/lib/db'
import { AnalysisEditClient } from '@/components/analysis/AnalysisEditClient'
import type { Metadata } from 'next'

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const rows = await sql`SELECT title FROM tenders WHERE id = ${params.id}`
    const t = rows[0] as { title: string } | undefined
    return { title: t ? `Analyse bewerken — ${t.title}` : 'Analyse bewerken' }
  } catch {
    return { title: 'Analyse bewerken' }
  }
}

export default async function TenderAnalysisEditPage({ params }: PageProps) {
  let tender: Tender | null = null
  let analysis: Analysis | null = null

  try {
    const tRows = await sql`SELECT * FROM tenders WHERE id = ${params.id}`
    tender = (tRows[0] as Tender) ?? null
    if (!tender) notFound()

    const aRows = await sql`SELECT * FROM analyses WHERE tender_id = ${params.id}`
    analysis = (aRows[0] as Analysis) ?? null
  } catch {
    notFound()
  }

  if (!tender || !analysis) {
    notFound()
  }

  return (
    <div className="max-w-6xl mx-auto">
      <AnalysisEditClient tender={tender} analysis={analysis} />
    </div>
  )
}
