'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Plus, BookOpen, ThumbsUp, ThumbsDown, Minus, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface LessonLearned {
  id: string
  title: string
  description: string
  outcome: 'positive' | 'negative' | 'neutral'
  category: string | null
  tags: string[] | null
  created_at: string
}

type Outcome = 'positive' | 'negative' | 'neutral'

function OutcomeIcon({ outcome }: { outcome: Outcome }) {
  if (outcome === 'positive')
    return <ThumbsUp className="w-4 h-4 text-green-400" />
  if (outcome === 'negative')
    return <ThumbsDown className="w-4 h-4 text-velocity-red" />
  return <Minus className="w-4 h-4 text-slate-ai" />
}

function outcomeVariant(outcome: Outcome): 'success' | 'danger' | 'neutral' {
  if (outcome === 'positive') return 'success'
  if (outcome === 'negative') return 'danger'
  return 'neutral'
}

export default function LessonsLearnedPage() {
  const [lessons, setLessons] = useState<LessonLearned[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [filterOutcome, setFilterOutcome] = useState<Outcome | ''>('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    outcome: 'neutral' as Outcome,
    category: '',
    tags: '',
  })

  useEffect(() => {
    void loadLessons()
  }, [filterOutcome])

  const loadLessons = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterOutcome) params.set('outcome', filterOutcome)
      const res = await fetch(`/api/lessons-learned?${params.toString()}`)
      if (res.ok) {
        const data = (await res.json()) as LessonLearned[]
        setLessons(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      const res = await fetch('/api/lessons-learned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        }),
      })

      if (res.ok) {
        setShowForm(false)
        setForm({ title: '', description: '', outcome: 'neutral', category: '', tags: '' })
        void loadLessons()
      }
    } catch {
      // ignore
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/lessons-learned/${id}`, { method: 'DELETE' })
      setLessons((prev) => prev.filter((l) => l.id !== id))
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-grotesk text-off-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-light" />
            Lessons Learned
          </h1>
          <p className="text-slate-ai text-sm mt-1">
            Kennis uit eerdere tenders — gebruikt bij toekomstige analyses
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="w-4 h-4" />
          Toevoegen
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-off-white">Nieuwe lesson learned</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-slate-ai hover:text-off-white"
              aria-label="Sluiten"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-off-white mb-1.5">
                  Titel <span className="text-velocity-red">*</span>
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-off-white placeholder-slate-ai focus:outline-none focus:border-ai-blue"
                  placeholder="Samenvatting van de les"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-off-white mb-1.5">
                  Uitkomst
                </label>
                <select
                  value={form.outcome}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, outcome: e.target.value as Outcome }))
                  }
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-off-white focus:outline-none focus:border-ai-blue"
                >
                  <option value="positive">Positief ✓</option>
                  <option value="neutral">Neutraal —</option>
                  <option value="negative">Negatief ✗</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-off-white mb-1.5">
                Beschrijving <span className="text-velocity-red">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-off-white placeholder-slate-ai focus:outline-none focus:border-ai-blue resize-none"
                placeholder="Wat heb je geleerd? Wat ging goed of fout?"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-off-white mb-1.5">
                  Categorie
                </label>
                <input
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-off-white placeholder-slate-ai focus:outline-none focus:border-ai-blue"
                  placeholder="Prijs, Kwaliteit, Proces..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-off-white mb-1.5">
                  Tags (komma-gescheiden)
                </label>
                <input
                  value={form.tags}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tags: e.target.value }))
                  }
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-off-white placeholder-slate-ai focus:outline-none focus:border-ai-blue"
                  placeholder="overheid, IT, prijs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForm(false)}
              >
                Annuleren
              </Button>
              <Button type="submit" variant="primary" loading={formLoading}>
                Opslaan
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {(['', 'positive', 'negative', 'neutral'] as const).map((o) => (
          <button
            key={o}
            onClick={() => setFilterOutcome(o)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              filterOutcome === o
                ? 'bg-ai-blue text-white'
                : 'bg-surface border border-border-subtle text-slate-ai hover:text-off-white'
            }`}
          >
            {o === '' ? 'Alles' : o === 'positive' ? 'Positief' : o === 'negative' ? 'Negatief' : 'Neutraal'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" label="Laden..." />
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-slate-ai mx-auto mb-3 opacity-40" />
          <p className="text-slate-ai text-sm">
            Nog geen lessons learned — voeg er een toe
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="card flex items-start gap-4 p-5 group"
            >
              <OutcomeIcon outcome={lesson.outcome} />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-off-white">{lesson.title}</h3>
                  <Badge variant={outcomeVariant(lesson.outcome)}>
                    {lesson.outcome === 'positive'
                      ? 'Positief'
                      : lesson.outcome === 'negative'
                      ? 'Negatief'
                      : 'Neutraal'}
                  </Badge>
                </div>
                <p className="text-sm text-slate-ai mt-1 leading-relaxed">
                  {lesson.description}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {lesson.category && (
                    <span className="text-xs text-slate-ai font-mono">
                      {lesson.category}
                    </span>
                  )}
                  {lesson.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-surface border border-border-subtle text-slate-ai px-1.5 py-0.5 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                  <span className="text-xs text-slate-ai ml-auto">
                    {formatDate(lesson.created_at)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => void handleDelete(lesson.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-ai hover:text-velocity-red transition-all"
                aria-label="Verwijder lesson learned"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
