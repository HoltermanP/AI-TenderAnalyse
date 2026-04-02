'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Mail } from 'lucide-react'
import { getErrorMessageFromResponse } from '@/lib/apiErrors'

type SettingsPayload = {
  smtp_mail_enabled: boolean
  smtp_host: string | null
  smtp_port: number
  smtp_secure: boolean
  smtp_user: string | null
  smtp_from_email: string | null
  smtp_from_name: string | null
  smtp_password_set: boolean
}

export function SmtpSettingsForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const [smtp_mail_enabled, setSmtpMailEnabled] = useState(false)
  const [smtp_host, setSmtpHost] = useState('')
  const [smtp_port, setSmtpPort] = useState(587)
  const [smtp_secure, setSmtpSecure] = useState(false)
  const [smtp_user, setSmtpUser] = useState('')
  const [smtp_password, setSmtpPassword] = useState('')
  const [smtp_from_email, setSmtpFromEmail] = useState('')
  const [smtp_from_name, setSmtpFromName] = useState('')
  const [smtp_password_set, setSmtpPasswordSet] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) throw new Error(await getErrorMessageFromResponse(res, 'Laden mislukt'))
        const data = (await res.json()) as SettingsPayload
        if (cancelled) return
        setSmtpMailEnabled(data.smtp_mail_enabled)
        setSmtpHost(data.smtp_host ?? '')
        setSmtpPort(data.smtp_port ?? 587)
        setSmtpSecure(data.smtp_secure)
        setSmtpUser(data.smtp_user ?? '')
        setSmtpFromEmail(data.smtp_from_email ?? '')
        setSmtpFromName(data.smtp_from_name ?? '')
        setSmtpPasswordSet(data.smtp_password_set)
        setSmtpPassword('')
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Laden mislukt')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setOk(false)
    try {
      const body: Record<string, unknown> = {
        smtp_mail_enabled,
        smtp_host: smtp_host.trim() || null,
        smtp_port,
        smtp_secure,
        smtp_user: smtp_user.trim() || null,
        smtp_from_email: smtp_from_email.trim() || null,
        smtp_from_name: smtp_from_name.trim() || null,
      }
      if (smtp_password.trim()) {
        body.smtp_password = smtp_password
      }

      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await getErrorMessageFromResponse(res, 'Opslaan mislukt'))
      const data = (await res.json()) as SettingsPayload
      setSmtpPasswordSet(data.smtp_password_set)
      setSmtpPassword('')
      setOk(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">SMTP-instellingen laden…</p>
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="smtp_mail_enabled"
          checked={smtp_mail_enabled}
          onChange={(e) => setSmtpMailEnabled(e.target.checked)}
          className="rounded border-border-subtle"
        />
        <label htmlFor="smtp_mail_enabled" className="text-sm font-medium text-foreground">
          E-mail versturen vanuit de app inschakelen
        </label>
      </div>
      <p className="text-xs text-muted">
        Als dit uit staat, is de knop <strong className="text-foreground">Mailen</strong> bij een
        tender zichtbaar maar niet actief. Vul hieronder je SMTP-server in (zoals bij je mailclient).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1.5">SMTP-host</label>
          <input
            type="text"
            className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-foreground"
            value={smtp_host}
            onChange={(e) => setSmtpHost(e.target.value)}
            placeholder="smtp.voorbeeld.nl"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Poort</label>
          <input
            type="number"
            className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-foreground"
            value={smtp_port}
            onChange={(e) => setSmtpPort(Number(e.target.value) || 587)}
            min={1}
            max={65535}
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={smtp_secure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
              className="rounded border-border-subtle"
            />
            SSL/TLS (vaak aan bij poort 465)
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Gebruikersnaam</label>
          <input
            type="text"
            className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-foreground"
            value={smtp_user}
            onChange={(e) => setSmtpUser(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Wachtwoord {smtp_password_set && <span className="text-muted font-normal">(ingevuld)</span>}
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-foreground"
            value={smtp_password}
            onChange={(e) => setSmtpPassword(e.target.value)}
            placeholder={smtp_password_set ? 'Laat leeg om te behouden' : ''}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Afzender e-mail</label>
          <input
            type="email"
            className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-foreground"
            value={smtp_from_email}
            onChange={(e) => setSmtpFromEmail(e.target.value)}
            placeholder="noreply@bedrijf.nl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Afzender naam (optioneel)</label>
          <input
            type="text"
            className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-foreground"
            value={smtp_from_name}
            onChange={(e) => setSmtpFromName(e.target.value)}
            placeholder="AI-TenderAnalyse"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-velocity-red" role="alert">
          {error}
        </p>
      )}
      {ok && (
        <p className="text-sm text-green-400" role="status">
          Instellingen opgeslagen.
        </p>
      )}

      <Button type="submit" loading={saving} variant="primary">
        <Mail className="w-4 h-4" />
        SMTP opslaan
      </Button>
    </form>
  )
}
