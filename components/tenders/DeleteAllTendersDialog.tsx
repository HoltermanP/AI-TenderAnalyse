'use client'

import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

interface DeleteAllTendersDialogProps {
  totalCount: number
}

export function DeleteAllTendersDialog({ totalCount }: DeleteAllTendersDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (totalCount <= 0) {
    return null
  }

  const handleDeleteAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tenders', { method: 'DELETE' })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Verwijderen mislukt')
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
      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={() => setOpen(true)}
        className="border-red-900/50 text-red-400 hover:bg-red-950/30 hover:border-red-800"
      >
        <Trash2 className="w-4 h-4" />
        Alles verwijderen
      </Button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative w-full max-w-md card-elevated border border-border-subtle rounded-xl p-6 shadow-2xl"
            role="dialog"
            aria-labelledby="delete-all-tenders-title"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2
                id="delete-all-tenders-title"
                className="text-lg font-semibold font-grotesk text-foreground"
              >
                Alle tenders verwijderen?
              </h2>
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                className="text-muted hover:text-foreground shrink-0"
                aria-label="Sluiten"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted leading-relaxed mb-4">
              Je staat op het punt om{' '}
              <strong className="text-foreground">
                {totalCount} tender{totalCount !== 1 ? 's' : ''}
              </strong>{' '}
              permanent te verwijderen, inclusief analyses en gerelateerde gegevens. Deze actie
              kan niet ongedaan worden gemaakt.
            </p>
            {error && (
              <p className="text-sm text-red-400 mb-4" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={loading}
                onClick={() => setOpen(false)}
              >
                Annuleren
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                loading={loading}
                onClick={() => void handleDeleteAll()}
              >
                Alles verwijderen
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
