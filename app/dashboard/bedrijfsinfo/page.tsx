'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Plus, X, Save, Building2 } from 'lucide-react'

interface CompanyInfo {
  id?: string
  name: string
  description: string
  strengths: string[]
  certifications: string[]
  sectors: string[]
  revenue_range: string
  employee_count: string
  founded_year: string
  website: string
  kvk_number: string
}

const EMPTY_COMPANY: CompanyInfo = {
  name: '',
  description: '',
  strengths: [],
  certifications: [],
  sectors: [],
  revenue_range: '',
  employee_count: '',
  founded_year: '',
  website: '',
  kvk_number: '',
}

function TagInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
      setInput('')
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-ai-blue/15 border border-ai-blue/20 text-blue-light text-xs px-2 py-1 rounded"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== tag))}
              className="hover:text-velocity-red transition-colors"
              aria-label={`Verwijder ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

export default function BedrijfsinfoPage() {
  const [data, setData] = useState<CompanyInfo>(EMPTY_COMPANY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/bedrijfsinfo')
        if (res.ok) {
          const json = (await res.json()) as CompanyInfo
          setData({ ...EMPTY_COMPANY, ...json })
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/bedrijfsinfo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? 'Opslaan mislukt')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" label="Bedrijfsinfo laden..." />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-grotesk text-foreground flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-light" />
          Bedrijfsinfo
        </h1>
        <p className="text-muted text-sm mt-1">
          Deze informatie wordt gebruikt bij de AI-analyse van tenders
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Basisinformatie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Bedrijfsnaam <span className="text-velocity-red">*</span>
                </label>
                <input
                  required
                  value={data.name}
                  onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue"
                  placeholder="Mijn Bedrijf BV"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  KVK-nummer
                </label>
                <input
                  value={data.kvk_number}
                  onChange={(e) => setData((d) => ({ ...d, kvk_number: e.target.value }))}
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue"
                  placeholder="12345678"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Bedrijfsomschrijving
              </label>
              <textarea
                rows={3}
                value={data.description}
                onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))}
                className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue resize-none"
                placeholder="Wat doet je bedrijf? Wat zijn jullie specialiteiten?"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Omzetrange
                </label>
                <select
                  value={data.revenue_range}
                  onChange={(e) => setData((d) => ({ ...d, revenue_range: e.target.value }))}
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ai-blue"
                >
                  <option value="">Selecteer...</option>
                  <option value="0-1M">€0 – €1M</option>
                  <option value="1-5M">€1M – €5M</option>
                  <option value="5-25M">€5M – €25M</option>
                  <option value="25-100M">€25M – €100M</option>
                  <option value="100M+">€100M+</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Medewerkers
                </label>
                <select
                  value={data.employee_count}
                  onChange={(e) => setData((d) => ({ ...d, employee_count: e.target.value }))}
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ai-blue"
                >
                  <option value="">Selecteer...</option>
                  <option value="1-10">1 – 10</option>
                  <option value="11-50">11 – 50</option>
                  <option value="51-200">51 – 200</option>
                  <option value="201-500">201 – 500</option>
                  <option value="500+">500+</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Opgericht
                </label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={data.founded_year}
                  onChange={(e) => setData((d) => ({ ...d, founded_year: e.target.value }))}
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue"
                  placeholder="2010"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Website
              </label>
              <input
                type="url"
                value={data.website}
                onChange={(e) => setData((d) => ({ ...d, website: e.target.value }))}
                className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue"
                placeholder="https://www.mijnbedrijf.nl"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Competenties & Profiel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <TagInput
              label="Sterktes"
              value={data.strengths}
              onChange={(v) => setData((d) => ({ ...d, strengths: v }))}
              placeholder="Bijv. Agile ontwikkeling, Cloud expertise..."
            />
            <TagInput
              label="Certificeringen"
              value={data.certifications}
              onChange={(v) => setData((d) => ({ ...d, certifications: v }))}
              placeholder="Bijv. ISO 27001, PRINCE2..."
            />
            <TagInput
              label="Sectoren"
              value={data.sectors}
              onChange={(v) => setData((d) => ({ ...d, sectors: v }))}
              placeholder="Bijv. Overheid, Zorg, Onderwijs..."
            />
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-velocity-red bg-red-900/20 border border-red-800/30 rounded-md px-4 py-3">
            {error}
          </p>
        )}

        {success && (
          <p className="text-sm text-green-400 bg-green-900/20 border border-green-800/30 rounded-md px-4 py-3">
            Bedrijfsinfo opgeslagen!
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" loading={saving}>
          <Save className="w-4 h-4" />
          Opslaan
        </Button>
      </form>
    </div>
  )
}
