'use client'

import { useState } from 'react'
import { Brain, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

interface StartAnalysisButtonProps {
  tenderId: string
  hasAnalysis: boolean
  variant?: 'primary' | 'cta' | 'outline'
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

    try {
      const res = await fetch(`/api/analyse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenderId }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? 'Analyse mislukt')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
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
