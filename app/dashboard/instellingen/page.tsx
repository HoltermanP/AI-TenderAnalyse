import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ThemeSettings } from '@/components/settings/ThemeSettings'
import { Settings, Building2, Palette, ChevronRight, Mail } from 'lucide-react'
import { SmtpSettingsForm } from '@/components/instellingen/SmtpSettingsForm'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Instellingen',
}

export default function InstellingenPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-grotesk text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-light" />
          Instellingen
        </h1>
        <p className="text-muted text-sm mt-1">
          Persoonlijke voorkeuren voor deze app
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-light" />
            <CardTitle>Weergave</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted mb-4">Kies het kleurthema voor het dashboard.</p>
          <ThemeSettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-light" />
            <CardTitle>Bedrijfsprofiel</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted">
            Gegevens die bij analyses en exports worden gebruikt.
          </p>
          <Link
            href="/dashboard/bedrijfsinfo"
            className={cn(
              'inline-flex items-center gap-2 font-medium rounded-md transition-colors',
              'border border-foreground/20 hover:border-foreground/40 bg-transparent text-foreground',
              'text-sm px-4 py-2'
            )}
          >
            Bedrijfsinfo bewerken
            <ChevronRight className="w-4 h-4" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-light" />
            <CardTitle>E-mail (SMTP)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted">
          <p>
            Stel je SMTP-server in om vanaf een tenderpagina de analyse per e-mail te versturen. De
            knop <strong className="text-foreground">Mailen</strong> is zichtbaar op elke geanalyseerde
            tender, maar werkt pas als je hier e-mail inschakelt en alle velden correct invult.
          </p>
          <SmtpSettingsForm />
        </CardContent>
      </Card>
    </div>
  )
}
