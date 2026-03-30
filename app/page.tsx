import Link from 'next/link'
import { ArrowRight, BarChart3, Brain, FileText, Shield, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-deep-black text-off-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="border-b border-border-subtle bg-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold font-grotesk">
            <span className="text-blue-light">AI</span>
            <span className="text-off-white">-TenderAnalyse</span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 bg-ai-blue hover:bg-blue-light text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            Open Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-surface border border-border-subtle rounded-full px-4 py-1.5 text-sm text-slate-ai mb-8">
          <Zap className="w-3.5 h-3.5 text-blue-light" />
          <span className="font-mono">AI-FIRST · WE SHIP FAST</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold font-grotesk mb-6 leading-tight">
          Tenders winnen met{' '}
          <span className="text-blue-light">AI</span>
        </h1>

        <p className="text-xl text-slate-ai max-w-2xl mx-auto mb-12">
          Analyseer TenderNed-tenders in seconden. Winkans berekenen, bid/no-bid bepalen,
          rapporten genereren — allemaal aangedreven door Claude AI.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 bg-velocity-red hover:bg-red-500 text-white font-semibold px-8 py-4 rounded-md transition-colors text-lg"
          >
            Start nu
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/dashboard/tenders"
            className="flex items-center justify-center gap-2 border border-off-white/20 hover:border-off-white/40 text-off-white font-semibold px-8 py-4 rounded-md transition-colors text-lg"
          >
            Bekijk tenders
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Brain,
              title: 'AI Analyse',
              description:
                'Claude analyseert tender documenten en berekent een winkans score op basis van jouw bedrijfsprofiel.',
              color: 'text-blue-light',
            },
            {
              icon: BarChart3,
              title: 'Bid / No-Bid',
              description:
                'Datagedreven aanbevelingen op basis van sterktes, zwaktes, kansen en risicos.',
              color: 'text-green-400',
            },
            {
              icon: FileText,
              title: 'PDF Rapporten',
              description:
                'Genereer professionele analyse rapporten en GAMMA presentaties met één klik.',
              color: 'text-velocity-red',
            },
            {
              icon: Shield,
              title: 'Lessons Learned',
              description:
                'Bouw een kennisbank op van gewonnen en verloren tenders voor betere toekomstige beslissingen.',
              color: 'text-amber-400',
            },
            {
              icon: Zap,
              title: 'TenderNed Integratie',
              description:
                'Haal direct tenders op van TenderNed — geen handmatig kopiëren meer.',
              color: 'text-blue-light',
            },
            {
              icon: Brain,
              title: 'AI Chat',
              description:
                'Stel vragen over tenders in natuurlijke taal en krijg direct antwoord van Claude.',
              color: 'text-purple-400',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="card p-6 hover:border-blue-light/30 transition-colors"
            >
              <feature.icon className={`w-8 h-8 ${feature.color} mb-4`} />
              <h3 className="text-lg font-semibold font-grotesk mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-ai text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xl font-bold font-grotesk">
            <span className="text-blue-light">AI</span>
            <span className="text-off-white">-Group.nl</span>
          </div>
          <p className="font-mono text-xs text-slate-ai tracking-widest">
            AI-FIRST · WE SHIP FAST
          </p>
          <p className="text-slate-ai text-sm">
            © {new Date().getFullYear()} AI-Group
          </p>
        </div>
      </footer>
    </div>
  )
}
