'use client'

import { useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

type SyncResponse = {
  error?: string
  message?: string
  imported?: number
  skipped?: number
  totalProcessed?: number
  totalPages?: number
  totalElements?: number
  importCap?: number | null
  fullCatalog?: boolean
}

export function TenderNedSyncDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [idsInput, setIdsInput] = useState('')
  const [cpvInput, setCpvInput] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [fullCatalog, setFullCatalog] = useState(false)
  const router = useRouter()

  const filterPayload = (): Record<string, string> => {
    const o: Record<string, string> = {}
    const cpv = cpvInput.trim()
    const q = searchInput.trim()
    if (cpv) o.cpvCodes = cpv
    if (q) o.search = q
    return o
  }

  const resetForm = () => {
    setIdsInput('')
    setCpvInput('')
    setSearchInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const ids = idsInput
      .split(/[\s,;]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0)

    try {
      const payload: Record<string, unknown> =
        ids.length > 0
          ? { publicatieIds: ids }
          : {
              ...filterPayload(),
              ...(fullCatalog ? { fullCatalog: true } : {}),
            }

      const res = await fetch('/api/tenderned/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as SyncResponse
      if (!res.ok) throw new Error(data.error ?? 'Sync mislukt')

      setOpen(false)
      resetForm()
      router.refresh()

      const capNote =
        data.fullCatalog || data.importCap == null
          ? ''
          : ` (max. ${data.importCap} meest recente uit de catalogus)`
      window.alert((data.message ?? 'Klaar') + capNote)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setLoading(false)
    }
  }

  const idsMode = !!idsInput.trim()

  return (
    <>
      <Button
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
        variant="outline"
        size="md"
      >
        <RefreshCw className="w-4 h-4" />
        TenderNed sync
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-xl card-elevated border border-border-subtle rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold font-grotesk text-foreground">
                TenderNed — openbare catalogus
              </h2>
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                className="text-muted hover:text-foreground disabled:opacity-40"
                aria-label="Sluiten"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted mb-4">
              Standaard worden alleen de{' '}
              <strong className="text-foreground">
                meest recente 100 tenders
              </strong>{' '}
              geïmporteerd (nieuwste eerst; aanpasbaar via{' '}
              <code className="text-blue-light text-xs">
                TENDERNED_IMPORT_MAX_TENDERS
              </code>
              ). Data via de{' '}
              <a
                href="https://data.overheid.nl/dataset/aankondigingen-van-overheidsopdrachten---tenderned"
                className="text-blue-light underline underline-offset-2 hover:text-foreground"
                target="_blank"
                rel="noreferrer"
              >
                publieke TenderNed-webservice
              </a>
              . Optioneel filter je op CPV en/of zoektekst.
            </p>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="tenderned-cpv"
                    className="block text-sm font-medium text-foreground mb-1.5"
                  >
                    CPV-code(s) — EU-formaat
                  </label>
                  <input
                    id="tenderned-cpv"
                    type="text"
                    value={cpvInput}
                    onChange={(e) => setCpvInput(e.target.value)}
                    disabled={loading || idsMode}
                    placeholder="bv. 72000000-0 of 72000000 (wordt 72000000-0)"
                    className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue font-mono disabled:opacity-50"
                  />
                  <p className="text-xs text-muted mt-1">
                    Meerdere codes: komma&apos;s. Alleen geldige 8-cijferige codes
                    worden meegestuurd.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="tenderned-search"
                    className="block text-sm font-medium text-foreground mb-1.5"
                  >
                    Zoektekst (titel / omschrijving)
                  </label>
                  <input
                    id="tenderned-search"
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    disabled={loading || idsMode}
                    placeholder="bv. cloud, software, beveiliging…"
                    className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue disabled:opacity-50"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer text-sm text-muted">
                <input
                  type="checkbox"
                  checked={fullCatalog}
                  onChange={(e) => setFullCatalog(e.target.checked)}
                  disabled={loading || idsMode}
                  className="mt-1 rounded border-border-subtle"
                />
                <span>
                  Volledige (gefilterde) catalogus importeren — kan lang duren en
                  vele duizenden records opleveren
                </span>
              </label>

              <div>
                <label
                  htmlFor="tenderned-ids"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Of: specifieke publicatie-ID&apos;s
                </label>
                <textarea
                  id="tenderned-ids"
                  value={idsInput}
                  onChange={(e) => setIdsInput(e.target.value)}
                  rows={2}
                  disabled={loading}
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue resize-none font-mono disabled:opacity-50"
                  placeholder="Leeg = laatste 100 (of volledige catalogus v/h vinkje) — of bv. 418038"
                />
              </div>

              {error && (
                <p className="text-sm text-velocity-red bg-red-900/20 border border-red-800/30 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Annuleren
                </Button>
                <Button type="submit" variant="primary" loading={loading}>
                  Importeren
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
