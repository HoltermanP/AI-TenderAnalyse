import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Settings, Database, Key, Palette, Building2, ChevronRight } from 'lucide-react'
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
          Configuratie, bedrijfsprofiel en API-integraties
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-light" />
            <CardTitle>Bedrijfsprofiel</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted">
          <p>
            Vul handmatig je bedrijfsgegevens, vestiging, contact, CPV-focus,
            referenties en strategische aandachtspunten in. Deze informatie wordt
            meegenomen bij elke AI-tenderanalyse en in exports.
          </p>
          <Link
            href="/dashboard/bedrijfsinfo"
            className={cn(
              'inline-flex items-center gap-2 font-medium rounded-md transition-colors',
              'border border-foreground/20 hover:border-foreground/40 bg-transparent text-foreground',
              'text-xs px-3 py-1.5 h-7'
            )}
          >
            Naar bedrijfsinfo
            <ChevronRight className="w-4 h-4" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-light" />
            <CardTitle>API Keys</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted">
          <p>
            API keys worden ingesteld via omgevingsvariabelen. Stel ze in via het{' '}
            <strong className="text-foreground">Vercel Dashboard</strong> onder
            Settings → Environment Variables.
          </p>

          <div className="space-y-2 font-mono text-xs">
            {[
              { key: 'ANTHROPIC_API_KEY', desc: 'Claude AI — voor analyse en chat' },
              { key: 'DATABASE_URL', desc: 'NEON PostgreSQL — voor dataopslag' },
              { key: 'BLOB_READ_WRITE_TOKEN', desc: 'Vercel Blob — voor bestandsopslag' },
              {
                key: 'TENDERNED_TNS_BASE_URL',
                desc: 'Optioneel — openbare JSON-catalogus (default: tenderned-rs-tns/v2)',
              },
              {
                key: 'TENDERNED_TNS_PAGE_SIZE',
                desc: 'Records per TNS-pagina (1–100, default 100)',
              },
              {
                key: 'TENDERNED_IMPORT_MAX_TENDERS',
                desc: 'Max. tenders per sync (meest recente eerst, default 100, max 500)',
              },
              {
                key: 'TENDERNED_USE_MOCK',
                desc: 'true = demo-data i.p.v. live TenderNed',
              },
              {
                key: 'GET /api/tenderned',
                desc: 'Query: page, size, cpv (CPV-codes), q of search (zoektekst)',
              },
              { key: 'GAMMA_API_KEY', desc: 'GAMMA — voor presentaties' },
            ].map(({ key, desc }) => (
              <div
                key={key}
                className="flex items-start justify-between gap-4 p-3 bg-surface rounded-md border border-border-subtle"
              >
                <span className="text-blue-light">{key}</span>
                <span className="text-muted text-right">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-light" />
            <CardTitle>Database</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted">
          <p>
            Gebruik NEON (neon.tech) voor PostgreSQL. Maak een gratis account aan en stel{' '}
            <code className="text-blue-light font-mono">DATABASE_URL</code> in.
          </p>
          <p>
            Voer de database migraties uit met:
          </p>
          <pre className="bg-surface border border-border-subtle rounded-md p-3 text-xs text-blue-light overflow-x-auto">
            npm run db:migrate
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-light" />
            <CardTitle>Thema</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted">
          <p>
            Schakel tussen donker, medium en licht thema via de knoppen rechtsboven
            in de navigatiebalk (maan / contrast / zon iconen).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
