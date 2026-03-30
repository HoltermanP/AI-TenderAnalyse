import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let _client: NeonQueryFunction<false, false> | null = null

function getClient(): NeonQueryFunction<false, false> {
  if (!_client) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    _client = neon(process.env.DATABASE_URL)
  }
  return _client
}

/**
 * SQL client — initialised on first query.
 * Supports both tagged template literals and regular calls.
 */
export function sql(
  strings: TemplateStringsArray | string,
  ...values: unknown[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (getClient() as any)(strings, ...values)
}

// Type definitions matching database schema
export interface Tender {
  id: string
  external_id: string | null
  title: string
  description: string | null
  contracting_authority: string | null
  deadline: string | null
  publication_date: string | null
  value: number | null
  currency: string | null
  category: string | null
  status: 'new' | 'in_progress' | 'analysed' | 'bid' | 'no_bid' | 'won' | 'lost'
  source: string
  url: string | null
  created_at: string
  updated_at: string
}

export interface Analysis {
  id: string
  tender_id: string
  score: number | null
  recommendation: 'bid' | 'no_bid' | 'review' | null
  summary: string | null
  strengths: string[] | null
  weaknesses: string[] | null
  risks: string[] | null
  opportunities: string[] | null
  win_probability: number | null
  effort_estimate: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  tender_id: string | null
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface Document {
  id: string
  tender_id: string | null
  name: string
  type: string
  size: number
  blob_url: string
  summary: string | null
  source: 'upload' | 'tenderned'
  external_document_id: string | null
  created_at: string
}

export interface LessonLearned {
  id: string
  tender_id: string | null
  title: string
  description: string
  outcome: 'positive' | 'negative' | 'neutral'
  category: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
}

export interface CompanyInfo {
  id: string
  name: string
  description: string | null
  strengths: string[] | null
  certifications: string[] | null
  sectors: string[] | null
  revenue_range: string | null
  employee_count: string | null
  founded_year: number | null
  website: string | null
  kvk_number: string | null
  updated_at: string
}
