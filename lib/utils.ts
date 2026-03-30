import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  value: number,
  currency = 'EUR',
  locale = 'nl-NL'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(dateString: string, locale = 'nl-NL'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString))
}

export function formatDateShort(dateString: string, locale = 'nl-NL'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString))
}

export function daysUntil(dateString: string): number {
  const now = new Date()
  const target = new Date(dateString)
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function scoreToColor(score: number): string {
  if (score >= 70) return '#22c55e' // green
  if (score >= 40) return '#f59e0b' // amber
  return '#FF4D1C' // velocity-red
}

export function scoreToLabel(score: number): string {
  if (score >= 70) return 'Hoog'
  if (score >= 40) return 'Gemiddeld'
  return 'Laag'
}

export function recommendationToLabel(
  rec: 'bid' | 'no_bid' | 'review' | null
): string {
  switch (rec) {
    case 'bid':
      return 'Inschrijven'
    case 'no_bid':
      return 'Niet inschrijven'
    case 'review':
      return 'Nader beoordelen'
    default:
      return 'Nog niet beoordeeld'
  }
}

export function recommendationToColor(
  rec: 'bid' | 'no_bid' | 'review' | null
): string {
  switch (rec) {
    case 'bid':
      return '#22c55e'
    case 'no_bid':
      return '#FF4D1C'
    case 'review':
      return '#f59e0b'
    default:
      return '#6B82A8'
  }
}

export function statusToLabel(
  status: string
): string {
  const map: Record<string, string> = {
    new: 'Nieuw',
    in_progress: 'In behandeling',
    analysed: 'Geanalyseerd',
    bid: 'Ingeschreven',
    no_bid: 'Afgezien',
    won: 'Gewonnen',
    lost: 'Verloren',
  }
  return map[status] ?? status
}

export function truncate(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

export function fileTypeIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'
  return '📎'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
}
