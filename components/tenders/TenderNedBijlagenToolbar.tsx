'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Download, FileArchive, Loader2 } from 'lucide-react'

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
      const raw = await res.text()
      let data: {
        error?: string
        added?: number
        skipped?: number
        totalListed?: number
        errors?: { documentNaam: string; error: string }[]
      } = {}
      if (raw) {
        try {
          data = JSON.parse(raw) as typeof data
        } catch {
          setError(
            `Ongeldig antwoord (${res.status}). ${raw.slice(0, 280).trim() || res.statusText || 'Geen details'}`
          )
          return
        }
      } else if (!res.ok) {
        setError(
          res.status === 504 || res.status === 503
            ? 'Server timeout — te veel of te grote bijlagen in één keer. Probeer opnieuw of sync in delen (Vercel: verhoog maxDuration of gebruik een Pro-plan).'
            : `Synchroniseren mislukt (HTTP ${res.status}).`
        )
        return
      }
      if (!res.ok) {
        setError(
          data.error ??
            (res.status === 504 || res.status === 503
              ? 'Server timeout — probeer opnieuw of verlaag het aantal bijlagen per sync.'
              : 'Synchroniseren mislukt')
        )
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(
        msg && msg !== 'Failed to fetch'
          ? `Netwerkfout: ${msg}`
          : 'Netwerkfout bij synchroniseren (geen verbinding met de server). Controleer internet en of de app draait.'
      )
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
          <Download className="w-4 h-4" aria-hidden />
        )}
        Alle bijlagen naar Blob halen
      </Button>

      {hasDocuments && (
        <a
          href={`/api/tenders/${tenderId}/bijlagen/zip`}
          className="inline-flex items-center justify-center gap-2 text-sm font-medium rounded-md border border-border-subtle bg-card hover:bg-muted/30 px-3 py-2 transition-colors"
        >
          <FileArchive className="w-4 h-4" aria-hidden />
          ZIP van Blob-downloaden
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
