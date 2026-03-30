import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

export function LoadingSpinner({
  size = 'md',
  className,
  label,
}: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full border-border-subtle border-t-blue-light animate-spin',
          sizes[size]
        )}
        role="status"
        aria-label={label ?? 'Laden...'}
      />
      {label && (
        <p className="text-sm text-muted font-mono">{label}</p>
      )}
    </div>
  )
}

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" label={label ?? 'Laden...'} />
    </div>
  )
}
