import Link from 'next/link'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="text-center">
        <p className="font-mono text-blue-light text-6xl font-bold mb-4">404</p>
        <h1 className="text-2xl font-bold font-grotesk text-foreground mb-2">
          Pagina niet gevonden
        </h1>
        <p className="text-muted mb-8">
          De pagina die je zoekt bestaat niet of is verplaatst.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-ai-blue hover:bg-blue-light text-white font-medium px-5 py-2.5 rounded-md transition-colors"
        >
          <Home className="w-4 h-4" />
          Terug naar dashboard
        </Link>
      </div>
    </div>
  )
}
