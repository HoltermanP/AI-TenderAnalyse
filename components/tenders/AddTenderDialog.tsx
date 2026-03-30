'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export function AddTenderDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))

    try {
      const res = await fetch('/api/tenders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? 'Aanmaken mislukt')
      }

      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="primary" size="md">
        <Plus className="w-4 h-4" />
        Tender toevoegen
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg card-elevated border border-border-subtle rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold font-grotesk text-foreground">
                Tender toevoegen
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted hover:text-foreground"
                aria-label="Sluiten"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Titel <span className="text-velocity-red">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  required
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue"
                  placeholder="Naam van de tender"
                />
              </div>

              <div>
                <label
                  htmlFor="contracting_authority"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Aanbestedende dienst
                </label>
                <input
                  id="contracting_authority"
                  name="contracting_authority"
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue"
                  placeholder="Gemeente, Ministerie, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="deadline"
                    className="block text-sm font-medium text-foreground mb-1.5"
                  >
                    Deadline
                  </label>
                  <input
                    id="deadline"
                    name="deadline"
                    type="date"
                    className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ai-blue"
                  />
                </div>
                <div>
                  <label
                    htmlFor="value"
                    className="block text-sm font-medium text-foreground mb-1.5"
                  >
                    Waarde (€)
                  </label>
                  <input
                    id="value"
                    name="value"
                    type="number"
                    min="0"
                    className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue"
                    placeholder="100000"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Categorie
                </label>
                <input
                  id="category"
                  name="category"
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue"
                  placeholder="IT, Bouw, Diensten..."
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Beschrijving
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue resize-none"
                  placeholder="Korte beschrijving van de tender..."
                />
              </div>

              <div>
                <label
                  htmlFor="url"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  URL
                </label>
                <input
                  id="url"
                  name="url"
                  type="url"
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ai-blue"
                  placeholder="https://www.tenderned.nl/..."
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
                >
                  Annuleren
                </Button>
                <Button type="submit" variant="primary" loading={loading}>
                  Tender aanmaken
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
