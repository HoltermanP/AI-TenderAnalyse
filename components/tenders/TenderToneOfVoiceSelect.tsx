'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mic2 } from 'lucide-react'
import {
  TONE_OF_VOICE_OPTIONS,
  normalizeToneOfVoiceId,
  type ToneOfVoiceId,
} from '@/lib/toneOfVoice'

interface TenderToneOfVoiceSelectProps {
  tenderId: string
  initialTone: string | null | undefined
}

export function TenderToneOfVoiceSelect({
  tenderId,
  initialTone,
}: TenderToneOfVoiceSelectProps) {
  const router = useRouter()
  const [value, setValue] = useState<ToneOfVoiceId>(() =>
    normalizeToneOfVoiceId(initialTone)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setValue(normalizeToneOfVoiceId(initialTone))
  }, [initialTone])

  const onChange = async (next: ToneOfVoiceId) => {
    setValue(next)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/tenders/${tenderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone_of_voice: next }),
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Opslaan mislukt')
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-muted/20 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Mic2 className="w-4 h-4 text-blue-light shrink-0" aria-hidden />
        <label htmlFor={`tone-${tenderId}`}>Tone of voice</label>
        {saving && (
          <span className="text-xs font-normal text-muted">Opslaan…</span>
        )}
      </div>
      <p className="text-xs text-muted leading-snug">
        Geldt voor AI-analyse, chat en toekomstige hulp bij inschrijvingen op deze tender.
      </p>
      <select
        id={`tone-${tenderId}`}
        className="w-full max-w-md rounded-md border border-border-subtle bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-light/40"
        value={value}
        onChange={(e) => void onChange(e.target.value as ToneOfVoiceId)}
        disabled={saving}
      >
        {TONE_OF_VOICE_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label} — {opt.hint}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-velocity-red" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
