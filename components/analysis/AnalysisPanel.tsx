'use client'

import { ScoreRing } from '@/components/ui/ScoreRing'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { recommendationToLabel, recommendationToColor } from '@/lib/utils'
import { CheckCircle2, XCircle, AlertTriangle, Lightbulb } from 'lucide-react'
import type { Analysis } from '@/lib/db'

interface AnalysisPanelProps {
  analysis: Analysis
}

function ListSection({
  title,
  items,
  icon: Icon,
  iconColor,
}: {
  title: string
  items: string[]
  icon: typeof CheckCircle2
  iconColor: string
}) {
  if (!items?.length) return null
  return (
    <div>
      <h4 className="text-sm font-semibold text-off-white mb-2">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-ai">
            <Icon
              className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconColor}`}
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  const recColor = recommendationToColor(analysis.recommendation)
  const recLabel = recommendationToLabel(analysis.recommendation)

  return (
    <div className="space-y-4">
      {/* Score overview */}
      <Card className="flex flex-col sm:flex-row items-center gap-6 p-6">
        <ScoreRing
          score={analysis.score ?? 0}
          size={100}
          strokeWidth={8}
          label="Totaalscore"
        />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span
              className="text-lg font-bold font-grotesk"
              style={{ color: recColor }}
            >
              {recLabel}
            </span>
            <Badge
              variant={
                analysis.recommendation === 'bid'
                  ? 'success'
                  : analysis.recommendation === 'no_bid'
                  ? 'danger'
                  : 'warning'
              }
            >
              {analysis.win_probability}% winkans
            </Badge>
          </div>
          {analysis.summary && (
            <p className="text-sm text-slate-ai leading-relaxed">
              {analysis.summary}
            </p>
          )}
          {analysis.effort_estimate && (
            <p className="text-xs text-slate-ai mt-2 font-mono">
              Inspanning: {analysis.effort_estimate}
            </p>
          )}
        </div>
      </Card>

      {/* Detailed sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Sterktes & Kansen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ListSection
              title="Sterktes"
              items={analysis.strengths ?? []}
              icon={CheckCircle2}
              iconColor="text-green-400"
            />
            <ListSection
              title="Kansen"
              items={analysis.opportunities ?? []}
              icon={Lightbulb}
              iconColor="text-amber-400"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zwaktes & Risicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ListSection
              title="Zwaktes"
              items={analysis.weaknesses ?? []}
              icon={XCircle}
              iconColor="text-velocity-red"
            />
            <ListSection
              title="Risicos"
              items={analysis.risks ?? []}
              icon={AlertTriangle}
              iconColor="text-amber-400"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
