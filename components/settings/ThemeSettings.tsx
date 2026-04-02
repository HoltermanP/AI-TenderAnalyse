'use client'

import { Sun, Moon, Contrast } from 'lucide-react'
import { useTheme, type Theme } from '@/components/providers/ThemeProvider'
import { cn } from '@/lib/utils'

const OPTIONS: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Licht' },
  { value: 'medium', icon: Contrast, label: 'Medium' },
  { value: 'dark', icon: Moon, label: 'Donker' },
]

export function ThemeSettings() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
              theme === opt.value
                ? 'border-ai-blue bg-ai-blue/15 text-blue-light'
                : 'border-border-subtle bg-surface text-muted hover:border-foreground/30 hover:text-foreground'
            )}
            aria-pressed={theme === opt.value}
          >
            <opt.icon className="h-4 w-4" aria-hidden />
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        Opgeslagen in deze browser (localStorage).
      </p>
    </div>
  )
}
