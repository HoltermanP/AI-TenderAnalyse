import { Suspense } from 'react'
import { KpiCard } from '@/components/ui/KpiCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { TenderCard } from '@/components/tenders/TenderCard'
import { Badge } from '@/components/ui/Badge'
import { sql } from '@/lib/db'
import type { Tender, Analysis } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { BarChart3, TrendingUp, Clock, Target } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

async function DashboardStats() {
  let tenders: (Tender & {
    analysis_score?: number
    analysis_rec?: string
    attachment_count?: number
  })[] = []
  let stats = {
    total: 0,
    active: 0,
    analysed: 0,
    won: 0,
    avgScore: 0,
  }

  try {
    const rows = await sql`
      SELECT t.*, la.score AS analysis_score, la.recommendation AS analysis_rec,
             (SELECT COUNT(*)::int FROM documents d WHERE d.tender_id = t.id) AS attachment_count
      FROM tenders t
      LEFT JOIN LATERAL (
        SELECT score, recommendation
        FROM analyses
        WHERE tender_id = t.id
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1
      ) la ON true
      ORDER BY t.created_at DESC
      LIMIT 6
    `
    tenders = rows as typeof tenders

    const statsRows = await sql`
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE t.status IN ('new', 'in_progress')) AS active,
        COUNT(*) FILTER (WHERE t.status = 'analysed') AS analysed,
        COUNT(*) FILTER (WHERE t.status = 'won') AS won,
        (SELECT ROUND(AVG(score))::int FROM analyses WHERE score IS NOT NULL) AS avg_score
      FROM tenders t
    `
    const s = statsRows[0] as typeof stats & { avg_score?: number }
    stats = {
      total: Number(s.total ?? 0),
      active: Number(s.active ?? 0),
      analysed: Number(s.analysed ?? 0),
      won: Number(s.won ?? 0),
      avgScore: Number(s.avg_score ?? 0),
    }
  } catch {
    // DB not yet configured — show empty state
  }

  const recentTenders = tenders.slice(0, 6)

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Totaal tenders"
          value={stats.total}
          sub="Alle tenders in systeem"
          color="blue"
        />
        <KpiCard
          label="Actief"
          value={stats.active}
          sub="In behandeling"
          color="amber"
        />
        <KpiCard
          label="Geanalyseerd"
          value={stats.analysed}
          sub="Met AI score"
          color="green"
        />
        <KpiCard
          label="Gemiddelde score"
          value={stats.avgScore || '—'}
          unit={stats.avgScore ? '/100' : ''}
          sub="Winkans indicator"
          color="blue"
        />
      </div>

      {/* Recent tenders */}
      <Card>
        <CardHeader>
          <CardTitle>Recente tenders</CardTitle>
          <Link href="/dashboard/tenders">
            <Button variant="ghost" size="sm">
              Alle tenders →
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentTenders.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-muted mx-auto mb-3 opacity-40" />
              <p className="text-muted text-sm mb-4">
                Nog geen tenders. Import van TenderNed of voeg handmatig toe.
              </p>
              <div className="flex justify-center gap-3">
                <Link href="/dashboard/tenders">
                  <Button variant="primary" size="sm">
                    Tenders beheren
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {recentTenders.map((tender) => (
                <TenderCard
                  key={tender.id}
                  tender={tender}
                  attachmentCount={Number(tender.attachment_count ?? 0)}
                  analysis={
                    tender.analysis_score != null
                      ? ({
                          score: tender.analysis_score,
                          recommendation: tender.analysis_rec as Analysis['recommendation'],
                        } as Analysis)
                      : null
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/tenders?source=tenderned" className="card hover:border-blue-light/30 transition-colors p-5 flex items-start gap-4 group">
          <div className="bg-ai-blue/15 p-3 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-light" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-blue-light transition-colors">
              TenderNed sync
            </h3>
            <p className="text-sm text-muted mt-1">
              Haal nieuwe tenders op van TenderNed
            </p>
          </div>
        </Link>

        <Link href="/dashboard/analyse" className="card hover:border-blue-light/30 transition-colors p-5 flex items-start gap-4 group">
          <div className="bg-velocity-red/15 p-3 rounded-lg">
            <Target className="w-5 h-5 text-velocity-red" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-blue-light transition-colors">
              Analyse starten
            </h3>
            <p className="text-sm text-muted mt-1">
              Analyseer een tender met AI
            </p>
          </div>
        </Link>

        <Link href="/dashboard/lessons-learned" className="card hover:border-blue-light/30 transition-colors p-5 flex items-start gap-4 group">
          <div className="bg-amber-500/15 p-3 rounded-lg">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-blue-light transition-colors">
              Lessons Learned
            </h3>
            <p className="text-sm text-muted mt-1">
              Voeg feedback toe uit afgeronde tenders
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold font-grotesk text-foreground">
          Dashboard
        </h1>
        <p className="text-muted text-sm mt-1">
          Overzicht van je tender pipeline en AI analyses
        </p>
      </div>

      <Suspense fallback={<PageLoader label="Dashboard laden..." />}>
        <DashboardStats />
      </Suspense>
    </div>
  )
}
