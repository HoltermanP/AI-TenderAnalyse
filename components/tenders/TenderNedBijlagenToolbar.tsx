'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Download, Loader2, RefreshCw } from 'lucide-react'

interface TenderNedBijlagenToolbarProps {
  tenderId: string
  source: string
  externalId: string | null
  hasDocuments: boolean
}

export function TenderNedBijlagenToolbar({
  tenderId,
  source,
  externalId,
  hasDocuments,
}: TenderNedBijlagenToolbarProps) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canSync = source === 'tenderned' && !!externalId

  if (!canSync) return null

  const sync = async () => {
    setSyncing(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(`/api/tenders/${tenderId}/bijlagen/sync`, {
        method: 'POST',
      })
      const data = (await res.json()) as {
        error?: string
        added?: number
        skipped?: number
        totalListed?: number
        errors?: { documentNaam: string; error: string }[]
      }
      if (!res.ok) {
        setError(data.error ?? 'Synchroniseren mislukt')
        return
      }
      const parts = [
        `${data.added ?? 0} nieuw opgeslagen op Blob`,
        `${data.skipped ?? 0} overgeslagen (al aanwezig of geen downloadlink)`,
        `${data.totalListed ?? 0} in TenderNed-lijst`,
      ]
      setMessage(parts.join(' · '))
      if (data.errors?.length) {
        const preview = data.errors
          .slice(0, 3)
          .map((e) => `${e.documentNaam}: ${e.error}`)
          .join('; ')
        setError(
          `${data.errors.length} fout(en). ${preview}${data.errors.length > 3 ? '…' : ''}`
        )
      }
      router.refresh()
    } catch {
      setError('Netwerkfout bij synchroniseren')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 mb-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={syncing}
        onClick={() => void sync()}
        className="gap-2"
      >
        {syncing ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="w-4 h-4" aria-hidden />
        )}
        Bijlagen ophalen van TenderNed
      </Button>

      {hasDocuments && (
        <a
          href={`/api/tenders/${tenderId}/bijlagen/zip`}
          className="inline-flex items-center justify-center gap-2 text-sm font-medium rounded-md border border-border-subtle bg-card hover:bg-muted/30 px-3 py-2 transition-colors"
        >
          <Download className="w-4 h-4" aria-hidden />
          Alle bijlagen downloaden (ZIP)
        </a>
      )}

      {message && (
        <p className="text-xs text-muted sm:w-full sm:order-last">{message}</p>
      )}
      {error && (
        <p className="text-xs text-velocity-red sm:w-full sm:order-last" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
