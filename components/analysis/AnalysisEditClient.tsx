'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Save, ArrowLeft, Brain } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ChatInterface } from '@/components/chat/ChatInterface'
import type { Analysis, Tender } from '@/lib/db'
import { getErrorMessageFromResponse } from '@/lib/apiErrors'

function linesToArr(s: string): string[] {
  return s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

function arrToLines(arr: string[] | null): string {
  return (arr ?? []).join('\n')
}

function buildChatContext(tender: Tender, form: FormState): string {
  const rec = form.recommendation
  const recLabel =
    rec === 'bid'
      ? 'Inschrijven'
      : rec === 'no_bid'
        ? 'Niet inschrijven'
        : rec === 'review'
          ? 'Nader beoordelen'
          : '—'

  return [
    'Je helpt bij het bewerken van een tenderanalyse in de applicatie.',
    'Geef concrete tekstvoorstellen in het Nederlands. Houd rekening met de huidige velden hieronder.',
    '',
    `Tender: ${tender.title}`,
    tender.contracting_authority
      ? `Aanbestedende dienst: ${tender.contracting_authority}`
      : '',
    '',
    `Score: ${form.score}`,
    `Aanbeveling: ${recLabel}`,
    `Winkans: ${form.win_probability}%`,
    form.effort_estimate ? `Inspanning: ${form.effort_estimate}` : '',
    '',
    'Samenvatting:',
    form.summary || '',
    '',
    'Sterktes (één per regel in het formulier):',
    linesToArr(form.strengthsText).map((l) => `• ${l}`).join('\n'),
    '',
    'Zwaktes:',
    linesToArr(form.weaknessesText).map((l) => `• ${l}`).join('\n'),
    '',
    'Kansen:',
    linesToArr(form.opportunitiesText).map((l) => `• ${l}`).join('\n'),
    '',
    'Risico’s:',
    linesToArr(form.risksText).map((l) => `• ${l}`).join('\n'),
  ]
    .filter((line) => line !== '')
    .join('\n')
}

type FormState = {
  score: number
  recommendation: 'bid' | 'no_bid' | 'review' | null
  summary: string
  strengthsText: string
  weaknessesText: string
  risksText: string
  opportunitiesText: string
  win_probability: number
  effort_estimate: string
}

export function AnalysisEditClient({
  tender,
  analysis,
}: {
  tender: Tender
  analysis: Analysis
}) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => ({
    score: analysis.score ?? 0,
    recommendation: analysis.recommendation,
    summary: analysis.summary ?? '',
    strengthsText: arrToLines(analysis.strengths),
    weaknessesText: arrToLines(analysis.weaknesses),
    risksText: arrToLines(analysis.risks),
    opportunitiesText: arrToLines(analysis.opportunities),
    win_probability: analysis.win_probability ?? 0,
    effort_estimate: analysis.effort_estimate ?? '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chatContext = useMemo(
    () => buildChatContext(tender, form),
    [tender, form]
  )

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/analyses/${tender.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: form.score,
          recommendation: form.recommendation,
          summary: form.summary || null,
          strengths: linesToArr(form.strengthsText),
          weaknesses: linesToArr(form.weaknessesText),
          risks: linesToArr(form.risksText),
          opportunities: linesToArr(form.opportunitiesText),
          win_probability: form.win_probability,
          effort_estimate: form.effort_estimate || null,
        }),
      })
      if (!res.ok) {
        throw new Error(await getErrorMessageFromResponse(res, 'Opslaan mislukt'))
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue transition-colors'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/dashboard/tenders/${tender.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar tender
        </Link>
        <Button onClick={() => void handleSave()} loading={saving} variant="primary">
          <Save className="w-4 h-4" />
          Wijzigingen opslaan
        </Button>
      </div>
      {error && (
        <p className="text-sm text-velocity-red" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analyse bewerken</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Score (0–100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={inputClass}
                    value={form.score}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        score: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Winkans (0–100%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={inputClass}
                    value={form.win_probability}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        win_probability: Math.min(
                          100,
                          Math.max(0, Number(e.target.value) || 0)
                        ),
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Aanbeveling
                </label>
                <select
                  className={inputClass}
                  value={form.recommendation ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    setForm((f) => ({
                      ...f,
                      recommendation:
                        v === 'bid' || v === 'no_bid' || v === 'review' ? v : null,
                    }))
                  }}
                >
                  <option value="">—</option>
                  <option value="bid">Inschrijven</option>
                  <option value="no_bid">Niet inschrijven</option>
                  <option value="review">Nader beoordelen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Inspanning / inzet
                </label>
                <textarea
                  className={`${inputClass} min-h-[72px]`}
                  value={form.effort_estimate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, effort_estimate: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Samenvatting
                </label>
                <textarea
                  className={`${inputClass} min-h-[120px]`}
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  rows={6}
                />
              </div>

              {(
                [
                  ['Sterktes', 'strengthsText' as const],
                  ['Zwaktes', 'weaknessesText' as const],
                  ['Kansen', 'opportunitiesText' as const],
                  ['Risico’s', 'risksText' as const],
                ] as const
              ).map(([label, key]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {label} (één punt per regel)
                  </label>
                  <textarea
                    className={`${inputClass} min-h-[96px] font-mono text-xs`}
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    rows={5}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="card flex flex-col min-h-[520px] max-h-[800px] xl:sticky xl:top-4">
          <div className="p-4 border-b border-border-subtle shrink-0">
            <h2 className="font-semibold text-foreground font-grotesk flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-light" />
              AI-hulp bij bewerken
            </h2>
            <p className="text-xs text-muted mt-0.5">
              De chat kent je huidige formulierwaarden. Sla op na grote wijzigingen.
            </p>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <ChatInterface
              tenderId={tender.id}
              initialContext={chatContext}
              placeholder="Vraag om herschrijven, punten toevoegen, of een kortere samenvatting…"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
