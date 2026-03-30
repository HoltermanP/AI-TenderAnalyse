'use client'

import { Bell, Sun, Moon, Contrast, Menu } from 'lucide-react'
import { useTheme } from '@/components/providers/ThemeProvider'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface TopbarProps {
  title?: string
  onMobileMenuToggle?: () => void
}

type Theme = 'dark' | 'medium' | 'light'

export function Topbar({ title, onMobileMenuToggle }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const [notifOpen, setNotifOpen] = useState(false)

  const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Licht' },
    { value: 'medium', icon: Contrast, label: 'Medium' },
    { value: 'dark', icon: Moon, label: 'Donker' },
  ]

  return (
    <header className="h-16 border-b border-border-subtle bg-surface/50 backdrop-blur-sm flex items-center px-6 gap-4 sticky top-0 z-40">
      {/* Mobile menu button */}
      <button
        className="md:hidden text-slate-ai hover:text-off-white"
        onClick={onMobileMenuToggle}
        aria-label="Menu openen"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Title */}
      {title && (
        <h1 className="text-lg font-semibold font-grotesk text-off-white hidden md:block">
          {title}
        </h1>
      )}

      <div className="flex-1" />

      {/* Theme switcher */}
      <div className="flex items-center gap-1 bg-surface border border-border-subtle rounded-md p-1">
        {themeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={cn(
              'p-1.5 rounded transition-colors',
              theme === opt.value
                ? 'bg-ai-blue text-white'
                : 'text-slate-ai hover:text-off-white'
            )}
            aria-label={`${opt.label} thema`}
            title={opt.label}
          >
            <opt.icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setNotifOpen((o) => !o)}
          className="relative text-slate-ai hover:text-off-white p-2 rounded-md hover:bg-surface transition-colors"
          aria-label="Meldingen"
        >
          <Bell className="w-5 h-5" />
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-12 w-72 card-elevated border border-border-subtle rounded-lg shadow-xl p-4 z-50">
            <p className="text-sm font-medium text-off-white mb-3">Meldingen</p>
            <p className="text-xs text-slate-ai text-center py-4">
              Geen nieuwe meldingen
            </p>
          </div>
        )}
      </div>
    </header>
  )
}
