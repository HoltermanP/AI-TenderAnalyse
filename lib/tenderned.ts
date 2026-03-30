/**
 * TenderNed API integration
 * TenderNed is the Dutch national procurement platform.
 * API documentation: https://www.tenderned.nl/developers
 */

export interface TenderNedResult {
  id: string
  title: string
  description: string
  contracting_authority: string
  deadline: string
  publication_date: string
  value?: number
  currency: string
  category: string
  url: string
  cpv_codes: string[]
  nuts_codes: string[]
  procedure_type: string
  status: string
}

export interface TenderNedSearchParams {
  query?: string
  category?: string
  deadline_from?: string
  deadline_to?: string
  value_min?: number
  value_max?: number
  page?: number
  page_size?: number
}

const BASE_URL =
  process.env.TENDERNED_API_URL ?? 'https://www.tenderned.nl/api'

async function tenderNedFetch<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (process.env.TENDERNED_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.TENDERNED_API_KEY}`
  }

  const response = await fetch(url.toString(), { headers, next: { revalidate: 300 } })

  if (!response.ok) {
    throw new Error(
      `TenderNed API error: ${response.status} ${response.statusText}`
    )
  }

  return response.json() as Promise<T>
}

export async function searchTenders(
  params: TenderNedSearchParams
): Promise<{ results: TenderNedResult[]; total: number; page: number }> {
  const queryParams: Record<string, string> = {}
  if (params.query) queryParams['q'] = params.query
  if (params.category) queryParams['category'] = params.category
  if (params.deadline_from) queryParams['deadlineFrom'] = params.deadline_from
  if (params.deadline_to) queryParams['deadlineTo'] = params.deadline_to
  if (params.value_min) queryParams['valueMin'] = String(params.value_min)
  if (params.value_max) queryParams['valueMax'] = String(params.value_max)
  if (params.page) queryParams['page'] = String(params.page)
  if (params.page_size) queryParams['pageSize'] = String(params.page_size)

  return tenderNedFetch('/tenders/search', queryParams)
}

export async function getTenderById(id: string): Promise<TenderNedResult> {
  return tenderNedFetch<TenderNedResult>(`/tenders/${id}`)
}

export async function getLatestTenders(limit = 20): Promise<TenderNedResult[]> {
  const result = await tenderNedFetch<{
    results: TenderNedResult[]
  }>('/tenders/latest', { limit: String(limit) })
  return result.results
}

// Mock data for development when API key is not set
export function getMockTenders(): TenderNedResult[] {
  return [
    {
      id: 'TN-2024-001',
      title: 'Levering en implementatie HR-softwaresysteem',
      description:
        'Aanbesteding voor de levering, implementatie en onderhoud van een HR-management systeem voor 500 medewerkers.',
      contracting_authority: 'Gemeente Amsterdam',
      deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
      publication_date: new Date(Date.now() - 7 * 86400000).toISOString(),
      value: 250000,
      currency: 'EUR',
      category: 'IT-software',
      url: 'https://www.tenderned.nl/tender/TN-2024-001',
      cpv_codes: ['72000000', '48000000'],
      nuts_codes: ['NL329'],
      procedure_type: 'Openbare procedure',
      status: 'Actief',
    },
    {
      id: 'TN-2024-002',
      title: 'Digitale transformatie gemeentelijke dienstverlening',
      description:
        'Het digitaliseren van gemeentelijke diensten inclusief burgerportaal, backoffice systemen en integraties.',
      contracting_authority: 'Gemeente Rotterdam',
      deadline: new Date(Date.now() + 21 * 86400000).toISOString(),
      publication_date: new Date(Date.now() - 3 * 86400000).toISOString(),
      value: 850000,
      currency: 'EUR',
      category: 'IT-consultancy',
      url: 'https://www.tenderned.nl/tender/TN-2024-002',
      cpv_codes: ['72200000', '72600000'],
      nuts_codes: ['NL33'],
      procedure_type: 'Onderhandelingsprocedure met aankondiging',
      status: 'Actief',
    },
    {
      id: 'TN-2024-003',
      title: 'Cloud migratie belastingdienst applicaties',
      description:
        'Migratie van legacy applicaties naar een moderne cloudinfrastructuur (Azure/AWS).',
      contracting_authority: 'Belastingdienst',
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      publication_date: new Date(Date.now() - 1 * 86400000).toISOString(),
      value: 1200000,
      currency: 'EUR',
      category: 'Cloud services',
      url: 'https://www.tenderned.nl/tender/TN-2024-003',
      cpv_codes: ['72700000'],
      nuts_codes: ['NL'],
      procedure_type: 'Openbare procedure',
      status: 'Actief',
    },
  ]
}
