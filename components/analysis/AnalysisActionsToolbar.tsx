'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FileDown,
  FileType2,
  Save,
  Pencil,
  Mail,
  Presentation,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { saveBlobToDisk } from '@/lib/saveBlobToDisk'
import { getErrorMessageFromResponse } from '@/lib/apiErrors'
import { cn } from '@/lib/utils'

interface AnalysisActionsToolbarProps {
  tenderId: string
  /** SMTP volledig en schakelaar aan — dan is mailen actief */
  mailEnabled: boolean
}

export function AnalysisActionsToolbar({
  tenderId,
  mailEnabled,
}: AnalysisActionsToolbarProps) {
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [loadingWord, setLoadingWord] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)
  const [loadingGamma, setLoadingGamma] = useState(false)
  const [mailOpen, setMailOpen] = useState(false)
  const [mailTo, setMailTo] = useState('')
  const [mailSubject, setMailSubject] = useState('')
  const [mailLoading, setMailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPdfBlob = async (): Promise<Blob> => {
    const res = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenderId }),
    })
    if (!res.ok) {
      const err = (await res.json()) as { error?: string }
      throw new Error(err.error ?? 'PDF genereren mislukt')
    }
    return res.blob()
  }

  const handlePdf = async () => {
    setLoadingPdf(true)
    setError(null)
    try {
      const blob = await fetchPdfBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tender-analyse-${tenderId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setLoadingPdf(false)
    }
  }

  const handleWord = async () => {
    setLoadingWord(true)
    setError(null)
    try {
      const res = await fetch('/api/export/word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenderId }),
      })
      if (!res.ok) {
        throw new Error(await getErrorMessageFromResponse(res, 'Word-export mislukt'))
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tender-analyse-${tenderId}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setLoadingWord(false)
    }
  }

  const handleSaveLocal = async () => {
    setLoadingSave(true)
    setError(null)
    try {
      const blob = await fetchPdfBlob()
      const result = await saveBlobToDisk(blob, `tender-analyse-${tenderId}.pdf`, {
        'application/pdf': ['.pdf'],
      })
      if (result === 'cancelled') {
        /* geen fout */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setLoadingSave(false)
    }
  }

  const handleGamma = async () => {
    setLoadingGamma(true)
    setError(null)
    try {
      const res = await fetch('/api/gamma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenderId }),
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? 'GAMMA presentatie mislukt')
      }
      const data = (await res.json()) as { url?: string }
      if (data.url) window.open(data.url, '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setLoadingGamma(false)
    }
  }

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mailTo.trim()) return
    setMailLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mail/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenderId,
          to: mailTo.trim(),
          subject: mailSubject.trim() || undefined,
        }),
      })
      if (!res.ok) {
        throw new Error(await getErrorMessageFromResponse(res, 'Versturen mislukt'))
      }
      setMailOpen(false)
      setMailTo('')
      setMailSubject('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setMailLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void handlePdf()}
          variant="outline"
          loading={loadingPdf}
          size="md"
        >
          <FileDown className="w-4 h-4" />
          PDF
        </Button>
        <Button
          type="button"
          onClick={() => void handleWord()}
          variant="outline"
          loading={loadingWord}
          size="md"
        >
          <FileType2 className="w-4 h-4" />
          Word
        </Button>
        <Button
          type="button"
          onClick={() => void handleSaveLocal()}
          variant="outline"
          loading={loadingSave}
          size="md"
          title="PDF opslaan op een locatie naar keuze (ondersteunde browsers)"
        >
          <Save className="w-4 h-4" />
          Opslaan
        </Button>
        <Link
          href={`/dashboard/tenders/${tenderId}/bewerken`}
          className={cn(
            'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-deep-black',
            'border border-foreground/20 hover:border-foreground/40 bg-transparent text-foreground',
            'text-sm px-4 py-2 h-9'
          )}
        >
          <Pencil className="w-4 h-4" />
          Bewerken
        </Link>
        <Button
          type="button"
          onClick={() => {
            if (mailEnabled) setMailOpen(true)
          }}
          variant="outline"
          size="md"
          disabled={!mailEnabled}
          title={
            mailEnabled
              ? 'Analyse per e-mail versturen'
              : 'Zet e-mail aan bij Instellingen en vul SMTP-gegevens in'
          }
        >
          <Mail className="w-4 h-4" />
          Mailen
        </Button>
        <Button
          type="button"
          onClick={() => void handleGamma()}
          variant="outline"
          loading={loadingGamma}
          size="md"
        >
          <Presentation className="w-4 h-4" />
          GAMMA
        </Button>
      </div>
      {error && <p className="text-xs text-velocity-red">{error}</p>}

      {mailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMailOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md card-elevated border border-border-subtle rounded-xl p-6 shadow-2xl">
            <h2 className="text-lg font-semibold font-grotesk text-foreground mb-4">
              Analyse mailen
            </h2>
            <form onSubmit={(e) => void handleSendMail(e)} className="space-y-4">
              <div>
                <label
                  htmlFor="mail-to"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Aan (e-mail) <span className="text-velocity-red">*</span>
                </label>
                <input
                  id="mail-to"
                  type="email"
                  required
                  value={mailTo}
                  onChange={(e) => setMailTo(e.target.value)}
                  className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-foreground"
                  placeholder="collega@voorbeeld.nl"
                />
              </div>
              <div>
                <label
                  htmlFor="mail-subj"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Onderwerp (optioneel)
                </label>
                <input
                  id="mail-subj"
                  type="text"
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-foreground"
                  placeholder="Tenderanalyse: …"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMailOpen(false)}
                >
                  Annuleren
                </Button>
                <Button type="submit" loading={mailLoading}>
                  Versturen
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
