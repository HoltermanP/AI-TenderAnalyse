'use client'

import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Button } from '@/components/ui/Button'

const STATUS_OPTIONS = [
  { value: '', label: 'Alle statussen' },
  { value: 'new', label: 'Nieuw' },
  { value: 'in_progress', label: 'In behandeling' },
  { value: 'analysed', label: 'Geanalyseerd' },
  { value: 'bid', label: 'Ingeschreven' },
  { value: 'no_bid', label: 'Afgezien' },
  { value: 'won', label: 'Gewonnen' },
  { value: 'lost', label: 'Verloren' },
]

const RECOMMENDATION_OPTIONS = [
  { value: '', label: 'Alle aanbevelingen' },
  { value: 'bid', label: 'Inschrijven' },
  { value: 'no_bid', label: 'Niet inschrijven' },
  { value: 'review', label: 'Nader beoordelen' },
]

export function TenderFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const clearFilters = () => {
    router.push(pathname)
  }

  const hasFilters = searchParams.has('q') || searchParams.has('status') || searchParams.has('rec')

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-ai"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Zoek tenders..."
          defaultValue={searchParams.get('q') ?? ''}
          onChange={(e) => updateParam('q', e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-surface border border-border-subtle rounded-md text-sm text-off-white placeholder-slate-ai focus:outline-none focus:border-ai-blue transition-colors"
          aria-label="Zoek tenders"
        />
      </div>

      {/* Status filter */}
      <div className="relative">
        <SlidersHorizontal
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-ai pointer-events-none"
          aria-hidden="true"
        />
        <select
          value={searchParams.get('status') ?? ''}
          onChange={(e) => updateParam('status', e.target.value)}
          className="pl-9 pr-8 py-2 bg-surface border border-border-subtle rounded-md text-sm text-off-white focus:outline-none focus:border-ai-blue appearance-none cursor-pointer transition-colors"
          aria-label="Filter op status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Recommendation filter */}
      <select
        value={searchParams.get('rec') ?? ''}
        onChange={(e) => updateParam('rec', e.target.value)}
        className="px-3 py-2 bg-surface border border-border-subtle rounded-md text-sm text-off-white focus:outline-none focus:border-ai-blue appearance-none cursor-pointer transition-colors"
        aria-label="Filter op aanbeveling"
      >
        {RECOMMENDATION_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface">
            {opt.label}
          </option>
        ))}
      </select>

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="md" onClick={clearFilters} className="gap-1.5">
          <X className="w-4 h-4" />
          Wis filters
        </Button>
      )}
    </div>
  )
}
