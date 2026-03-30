'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileSearch,
  Brain,
  MessageSquare,
  Building2,
  BookOpen,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/tenders', label: 'Tenders', icon: FileSearch },
  { href: '/dashboard/analyse', label: 'Analyse', icon: Brain },
  { href: '/dashboard/chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/dashboard/bedrijfsinfo', label: 'Bedrijfsinfo', icon: Building2 },
  { href: '/dashboard/lessons-learned', label: 'Lessons Learned', icon: BookOpen },
]

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <nav className="absolute left-0 top-0 bottom-0 w-64 bg-surface border-r border-border-subtle flex flex-col">
        <div className="h-16 flex items-center justify-between px-5 border-b border-border-subtle">
          <span className="text-lg font-bold font-grotesk">
            <span className="text-blue-light">AI</span>
            <span className="text-foreground">-Tender</span>
          </span>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground"
            aria-label="Menu sluiten"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 mx-2 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-ai-blue/15 text-blue-light border border-ai-blue/20'
                    : 'text-muted hover:text-foreground hover:bg-surface'
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="p-4 border-t border-border-subtle">
          <p className="text-center text-[10px] font-mono text-muted/50 tracking-widest">
            AI-FIRST · WE SHIP FAST
          </p>
        </div>
      </nav>
    </div>
  )
}
