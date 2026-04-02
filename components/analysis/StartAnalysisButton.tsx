'use client'

import { useState } from 'react'
import { Brain, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { emitTenderDocumentsProgress } from '@/lib/tenderDocumentEvents'

interface StartAnalysisButtonProps {
  tenderId: string
  hasAnalysis: boolean
  variant?: 'primary' | 'cta' | 'outline'
}

async function getErrorMessageFromResponse(
  res: Response,
  fallback: string
): Promise<string> {
  const contentType = res.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const data = (await res.json()) as { error?: string; message?: string }
      if (typeof data.error === 'string' && data.error.trim()) return data.error
      if (typeof data.message === 'string' && data.message.trim()) return data.message
    } catch {
      // Fallback handled below
    }
  }

  try {
    const text = await res.text()
    if (text.trim()) {
      // Do not surface HTML error pages directly to users.
      if (text.trimStart().startsWith('<')) return `${fallback} (HTTP ${res.status})`
      return text.trim().slice(0, 200)
    }
  } catch {
    // Ignore and fallback
  }

  return `${fallback} (HTTP ${res.status})`
}

export function StartAnalysisButton({
  tenderId,
  hasAnalysis,
  variant = 'primary',
}: StartAnalysisButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleAnalyse = async () => {
    setLoading(true)
    setError(null)
    emitTenderDocumentsProgress(tenderId, 'start')

    try {
      const prep = await fetch(
        `/api/tenders/${encodeURIComponent(tenderId)}/analysis-prepare`,
        { method: 'POST' }
      )
      if (!prep.ok) {
        throw new Error(
          await getErrorMessageFromResponse(prep, 'Voorbereiden mislukt'))
      }

      const res = await fetch(`/api/analyse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenderId }),
      })

      if (!res.ok) {
        throw new Error(await getErrorMessageFromResponse(res, 'Analyse mislukt'))
      }

      router.push(`/dashboard/analyse?tenderId=${encodeURIComponent(tenderId)}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      emitTenderDocumentsProgress(tenderId, 'end')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        onClick={() => void handleAnalyse()}
        variant={variant}
        loading={loading}
        size="md"
      >
        {hasAnalysis ? (
          <RefreshCw className="w-4 h-4" />
        ) : (
          <Brain className="w-4 h-4" />
        )}
        {hasAnalysis ? 'Heranalyseer' : 'AI Analyse starten'}
      </Button>
      {error && (
        <p className="text-xs text-velocity-red">{error}</p>
      )}
    </div>
  )
}
