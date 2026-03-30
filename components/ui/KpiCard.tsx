import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string | number
  unit?: string
  sub?: string
  className?: string
  color?: 'blue' | 'green' | 'red' | 'amber'
}

export function KpiCard({ label, value, unit, sub, className, color = 'blue' }: KpiCardProps) {
  const colorMap = {
    blue: 'text-blue-light',
    green: 'text-green-400',
    red: 'text-velocity-red',
    amber: 'text-amber-400',
  }

  return (
    <div className={cn('card p-5', className)}>
      <p className="text-xs text-muted font-mono uppercase tracking-widest mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className={cn('font-mono font-bold text-3xl', colorMap[color])}>
          {value}
        </span>
        {unit && (
          <span className="text-muted text-sm font-mono">{unit}</span>
        )}
      </div>
      {sub && (
        <p className="text-xs text-muted mt-1">{sub}</p>
      )}
    </div>
  )
}
