import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default:
      'bg-surface border border-border-subtle text-off-white',
    success:
      'bg-green-900/30 border border-green-800/50 text-green-400',
    warning:
      'bg-amber-900/30 border border-amber-800/50 text-amber-400',
    danger:
      'bg-red-900/30 border border-red-800/50 text-velocity-red',
    info: 'bg-blue-900/30 border border-blue-800/50 text-blue-light',
    neutral:
      'bg-surface border border-border-subtle text-slate-ai',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
