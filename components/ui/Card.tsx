import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  elevated?: boolean
  hover?: boolean
}

export function Card({ children, className, elevated, hover }: CardProps) {
  return (
    <div
      className={cn(
        elevated ? 'card-elevated' : 'card',
        hover && 'hover:border-blue-light/30 transition-colors cursor-pointer',
        'p-5',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  )
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h3 className={cn('font-semibold text-off-white font-grotesk', className)}>
      {children}
    </h3>
  )
}

export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('', className)}>{children}</div>
}
