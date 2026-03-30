'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error)
    }
  }, [error])

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-12 h-12 text-velocity-red mx-auto mb-4" />
        <h2 className="text-xl font-bold font-grotesk text-foreground mb-2">
          Er is iets misgegaan
        </h2>
        <p className="text-muted text-sm mb-6">
          {error.message ?? 'Een onverwachte fout is opgetreden.'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-ai-blue hover:bg-blue-light text-white font-medium px-5 py-2.5 rounded-md transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Probeer opnieuw
        </button>
      </div>
    </div>
  )
}
