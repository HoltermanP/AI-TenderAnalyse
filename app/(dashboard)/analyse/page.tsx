'use client'

import { useState, useEffect } from 'react'
import { Brain, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel'
import type { Analysis } from '@/lib/db'

interface TenderOption {
  id: string
  title: string
  contracting_authority: string | null
}

export default function AnalysePage() {
  const [tenders, setTenders] = useState<TenderOption[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/tenders?limit=50')
        if (res.ok) {
          const data = (await res.json()) as { tenders: TenderOption[] }
          setTenders(data.tenders ?? [])
        }
      } catch {
        // ignore
      }
    }
    void load()
  }, [])

  const loadAnalysis = async (id: string) => {
    if (!id) return
    setLoading(true)
    setAnalysis(null)
    setError(null)

    try {
      const res = await fetch(`/api/analyse?tenderId=${id}`)
      if (res.ok) {
        const data = (await res.json()) as Analysis
        setAnalysis(data)
      }
    } catch {
      // no existing analysis
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (id: string) => {
    setSelectedId(id)
    void loadAnalysis(id)
  }

  const handleAnalyse = async () => {
    if (!selectedId) return
    setAnalysing(true)
    setError(null)

    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenderId: selectedId }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? 'Analyse mislukt')
      }

      const data = (await res.json()) as Analysis
      setAnalysis(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setAnalysing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-grotesk text-off-white flex items-center gap-2">
          <Brain className="w-6 h-6 text-blue-light" />
          Tender Analyse
        </h1>
        <p className="text-slate-ai text-sm mt-1">
          Selecteer een tender en start een AI-analyse voor bid/no-bid aanbeveling
        </p>
      </div>

      {/* Tender selector */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-off-white mb-1.5">
            Selecteer tender
          </label>
          <select
            value={selectedId}
            onChange={(e) => handleSelect(e.target.value)}
            className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-off-white focus:outline-none focus:border-ai-blue"
            aria-label="Selecteer een tender om te analyseren"
          >
            <option value="">-- Kies een tender --</option>
            {tenders.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
                {t.contracting_authority ? ` — ${t.contracting_authority}` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedId && (
          <Button
            onClick={() => void handleAnalyse()}
            variant="cta"
            size="lg"
            loading={analysing}
          >
            <Brain className="w-5 h-5" />
            {analysis ? 'Heranalyseer met AI' : 'Start AI Analyse'}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-velocity-red bg-red-900/20 border border-red-800/30 rounded-md px-4 py-3">
          {error}
        </p>
      )}

      {/* Analysis result */}
      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" label="Analyse ophalen..." />
        </div>
      )}

      {analysing && (
        <div className="card p-8 text-center">
          <div className="animate-pulse-glow inline-flex p-4 bg-ai-blue/15 rounded-full mb-4">
            <Brain className="w-8 h-8 text-blue-light" />
          </div>
          <p className="text-off-white font-medium">Claude analyseert de tender...</p>
          <p className="text-slate-ai text-sm mt-1">
            Dit kan 15-30 seconden duren
          </p>
        </div>
      )}

      {analysis && !analysing && (
        <AnalysisPanel analysis={analysis} />
      )}

      {!selectedId && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-slate-ai mx-auto mb-3 opacity-40" />
          <p className="text-slate-ai">
            Selecteer een tender om de analyse te starten
          </p>
        </div>
      )}
    </div>
  )
}
