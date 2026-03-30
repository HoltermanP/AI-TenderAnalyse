'use client'

import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

interface DeleteTenderButtonProps {
  tenderId: string
  tenderTitle: string
  /** Na succes: navigeer hierheen i.p.v. alleen refreshen */
  redirectTo?: string
  /** Compact icoon voor tenderkaarten */
  compact?: boolean
}

export function DeleteTenderButton({
  tenderId,
  tenderTitle,
  redirectTo,
  compact,
}: DeleteTenderButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tenders/${tenderId}`, { method: 'DELETE' })
      if (res.status === 404) {
        throw new Error('Tender niet gevonden')
      }
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Verwijderen mislukt')
      }
      setOpen(false)
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-red-950/40 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-light"
          aria-label="Tender verwijderen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Verwijderen
        </Button>
      )}

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
            aria-labelledby="delete-tender-title"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2
                id="delete-tender-title"
                className="text-lg font-semibold font-grotesk text-foreground"
              >
                Tender verwijderen?
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
              <span className="text-foreground font-medium line-clamp-2">
                {tenderTitle}
              </span>{' '}
              wordt permanent verwijderen, inclusief gekoppelde analysegegevens en
              opgeslagen bijlagen (blob storage).
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
                onClick={() => void handleDelete()}
              >
                Verwijderen
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
