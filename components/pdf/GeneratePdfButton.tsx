'use client'

import { useState } from 'react'
import { FileDown, Presentation } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface GeneratePdfButtonProps {
  tenderId: string
}

export function GeneratePdfButton({ tenderId }: GeneratePdfButtonProps) {
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [loadingGamma, setLoadingGamma] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePdf = async () => {
    setLoadingPdf(true)
    setError(null)
    try {
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenderId }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? 'PDF genereren mislukt')
      }

      const blob = await res.blob()
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
      if (data.url) {
        window.open(data.url, '_blank')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setLoadingGamma(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Button
          onClick={() => void handlePdf()}
          variant="outline"
          loading={loadingPdf}
          size="md"
        >
          <FileDown className="w-4 h-4" />
          PDF
        </Button>
        <Button
          onClick={() => void handleGamma()}
          variant="outline"
          loading={loadingGamma}
          size="md"
        >
          <Presentation className="w-4 h-4" />
          GAMMA
        </Button>
      </div>
      {error && (
        <p className="text-xs text-velocity-red">{error}</p>
      )}
    </div>
  )
}
