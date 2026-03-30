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
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: '/dashboard/tenders',
    label: 'Tenders',
    icon: FileSearch,
  },
  {
    href: '/dashboard/analyse',
    label: 'Analyse',
    icon: Brain,
  },
  {
    href: '/dashboard/chat',
    label: 'AI Chat',
    icon: MessageSquare,
  },
  {
    href: '/dashboard/bedrijfsinfo',
    label: 'Bedrijfsinfo',
    icon: Building2,
  },
  {
    href: '/dashboard/lessons-learned',
    label: 'Lessons Learned',
    icon: BookOpen,
  },
  {
    href: '/dashboard/instellingen',
    label: 'Instellingen',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-surface border-r border-border-subtle transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border-subtle">
        {collapsed ? (
          <span className="text-blue-light font-bold font-mono text-lg mx-auto">AI</span>
        ) : (
          <span className="text-lg font-bold font-grotesk">
            <span className="text-blue-light">AI</span>
            <span className="text-foreground">-Tender</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5" aria-label="Hoofdnavigatie">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-ai-blue/15 text-blue-light border border-ai-blue/20'
                  : 'text-muted hover:text-foreground hover:bg-surface'
              )}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border-subtle p-3">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center w-full py-2 text-muted hover:text-foreground rounded-md transition-colors"
          aria-label={collapsed ? 'Sidebar uitklappen' : 'Sidebar inklappen'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="text-xs">Inklappen</span>
            </>
          )}
        </button>
        {!collapsed && (
          <p className="text-center text-[10px] font-mono text-muted/50 mt-2 tracking-widest">
            AI-FIRST · WE SHIP FAST
          </p>
        )}
      </div>
    </aside>
  )
}
