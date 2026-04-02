/**
 * TenderNed — publieke aankondigingen (geen login)
 *
 * Bron: Notice Service (TNS) JSON — zoal vermeld op data.overheid.nl
 * https://data.overheid.nl/dataset/aankondigingen-van-overheidsopdrachten---tenderned
 *
 * Lijst: GET {base}/publicaties?page=&size=
 * Detail: GET {base}/publicaties/{id}
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

const DEFAULT_TNS_BASE =
  'https://www.tenderned.nl/papi/tenderned-rs-tns/v2'

export function getTnsBaseUrl(): string {
  const u =
    process.env.TENDERNED_TNS_BASE_URL?.trim() ||
    process.env.TENDERNED_PAPI_BASE_URL?.trim()
  return (u ?? DEFAULT_TNS_BASE).replace(/\/$/, '')
}

export function useTendernedMock(): boolean {
  return process.env.TENDERNED_USE_MOCK === 'true'
}

export function getDefaultListPageSize(): number {
  const n = parseInt(process.env.TENDERNED_TNS_PAGE_SIZE ?? '100', 10)
  return Math.min(Math.max(1, n), 100)
}

/** Max aantal tenders per catalogus-import (meest recente eerst, TNS page 0 = nieuwste). */
export function getMaxTendersPerImport(): number {
  const n = parseInt(process.env.TENDERNED_IMPORT_MAX_TENDERS ?? '100', 10)
  return Math.min(Math.max(1, n), 500)
}

// ——— TNS types (subset) ———

interface TnsCodeOmschrijving {
  code?: string
  omschrijving?: string
}

interface TnsListItem {
  publicatieId: string
  publicatieDatum?: string
  typePublicatie?: TnsCodeOmschrijving
  aanbestedingNaam?: string
  opdrachtgeverNaam?: string
  sluitingsDatum?: string
  procedure?: TnsCodeOmschrijving
  typeOpdracht?: TnsCodeOmschrijving
  publicatiestatus?: TnsCodeOmschrijving
  opdrachtBeschrijving?: string
  link?: { href?: string }
}

export interface TnsPageResponse {
  content: TnsListItem[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  last: boolean
  first: boolean
}

/** Filters voor GET …/publicaties (TNS ondersteunt o.a. cpvCodes + search). */
export interface TnsListFilters {
  /** Volledige CPV-codes zoals `72000000-0` (EU-formaat); meerdere = OF-filter. */
  cpvCodes?: string[]
  /** Vrije tekst in titel/beschrijving (parameter `search`). */
  search?: string
}

/**
 * Ruwe invoer (komma/gescheiden) naar TNS-cpvCodes.
 * 8 cijfers zonder controlegetal → `-0` wordt toegevoegd (vaak voldoende; controlegetal kan afwijken).
 */
export function parseCpvCodesInput(input: string | number | undefined | null): string[] {
  if (input == null) return []
  const str = typeof input === 'string' ? input : String(input)
  if (!str.trim()) return []
  const parts = str
    .split(/[,;\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const out: string[] = []
  for (const p of parts) {
    if (/^\d{8}-\d$/.test(p)) out.push(p)
    else if (/^\d{8}$/.test(p)) out.push(`${p}-0`)
  }
  return Array.from(new Set(out))
}

function normalizeCpvCodeListForFilters(
  raw: string | string[] | number | undefined | null
): string[] | undefined {
  if (raw == null) return undefined
  if (Array.isArray(raw)) {
    const parsed = raw.flatMap((s) => parseCpvCodesInput(s))
    return parsed.length ? parsed : undefined
  }
  const parsed = parseCpvCodesInput(raw)
  return parsed.length ? parsed : undefined
}

export function buildTnsListFilters(body: {
  cpvCodes?: string | string[] | null
  search?: string | null
}): TnsListFilters | undefined {
  const cpvCodes = normalizeCpvCodeListForFilters(body.cpvCodes ?? undefined)
  const rawSearch = body.search == null ? '' : String(body.search).trim()
  const q = rawSearch.length > 0 ? rawSearch.slice(0, 500) : undefined
  const out: TnsListFilters = {}
  if (cpvCodes?.length) out.cpvCodes = cpvCodes
  if (q) out.search = q
  return Object.keys(out).length > 0 ? out : undefined
}

function normalizeToIso(dateStr: string | undefined, fallback: string): string {
  if (!dateStr?.trim()) return fallback
  const d = new Date(dateStr)
  if (!Number.isNaN(d.getTime())) return d.toISOString()
  const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})$/)
  if (m) {
    const d2 = new Date(`${m[1]}T12:00:00`)
    if (!Number.isNaN(d2.getTime())) return d2.toISOString()
  }
  return fallback
}

export function mapListItemToTender(item: TnsListItem): TenderNedResult {
  const id = String(item.publicatieId ?? '')
  const now = new Date().toISOString()
  return {
    id,
    title: (item.aanbestedingNaam ?? 'Zonder titel').slice(0, 500),
    description: item.opdrachtBeschrijving ?? '',
    contracting_authority: (item.opdrachtgeverNaam ?? 'Onbekend').slice(
      0,
      255
    ),
    deadline: normalizeToIso(item.sluitingsDatum, now),
    publication_date: normalizeToIso(item.publicatieDatum, now),
    currency: 'EUR',
    category: item.typeOpdracht?.omschrijving ?? '',
    url:
      item.link?.href ??
      `https://www.tenderned.nl/aankondigingen/overzicht/${id}`,
    cpv_codes: [],
    nuts_codes: [],
    procedure_type: (item.procedure?.omschrijving ?? '').slice(0, 255),
    status: item.publicatiestatus?.omschrijving ?? 'Gepubliceerd',
  }
}

function readCpvCodes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const el of raw) {
    if (el && typeof el === 'object' && 'code' in el) {
      const c = String((el as { code: unknown }).code).trim()
      if (c) out.push(c.split('-')[0] ?? c)
    }
  }
  return Array.from(new Set(out)).slice(0, 50)
}

function readNutsCodes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const el of raw) {
    if (el && typeof el === 'object' && 'code' in el) {
      const c = String((el as { code: unknown }).code).trim()
      if (c) out.push(c.toUpperCase())
    }
  }
  return Array.from(new Set(out)).slice(0, 20)
}

export function mapDetailJsonToTender(raw: unknown): TenderNedResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('TenderNed: onbekend detail-antwoord')
  }
  const d = raw as Record<string, unknown>
  const id = String(d.publicatieId ?? '')
  if (!id) throw new Error('TenderNed: geen publicatieId in detail')

  const proc = d.procedureCode as TnsCodeOmschrijving | undefined
  const typeOp = d.typeOpdrachtCode as TnsCodeOmschrijving | undefined
  const now = new Date().toISOString()
  const url = `https://www.tenderned.nl/aankondigingen/overzicht/${id}`

  return {
    id,
    title: String(d.aanbestedingNaam ?? 'Zonder titel').slice(0, 500),
    description: String(d.opdrachtBeschrijving ?? ''),
    contracting_authority: String(d.opdrachtgeverNaam ?? 'Onbekend').slice(
      0,
      255
    ),
    deadline: normalizeToIso(String(d.sluitingsDatum ?? ''), now),
    publication_date: normalizeToIso(String(d.publicatieDatum ?? ''), now),
    currency: 'EUR',
    category: typeOp?.omschrijving ?? '',
    url,
    cpv_codes: readCpvCodes(d.cpvCodes ?? d.cpvCode),
    nuts_codes: readNutsCodes(d.nutsCodes ?? d.nutsCode),
    procedure_type: (proc?.omschrijving ?? '').slice(0, 255),
    status:
      typeof d.aanbestedingStatus === 'string'
        ? d.aanbestedingStatus
        : 'Gepubliceerd',
  }
}

export async function fetchPublicationsPage(
  page: number,
  size: number,
  filters?: TnsListFilters
): Promise<TnsPageResponse> {
  if (useTendernedMock()) {
    let mock = getMockTenders()
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      mock = mock.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
      )
    }
    if (filters?.cpvCodes?.length) {
      const need = filters.cpvCodes.map((c) => c.split('-')[0])
      mock = mock.filter((m) =>
        m.cpv_codes.some((mc) =>
          need.some((n) => mc === n || mc.startsWith(n))
        )
      )
    }
    return {
      content: mock.map((m) => ({
        publicatieId: m.id,
        publicatieDatum: m.publication_date,
        aanbestedingNaam: m.title,
        opdrachtgeverNaam: m.contracting_authority,
        sluitingsDatum: m.deadline,
        opdrachtBeschrijving: m.description,
        procedure: { omschrijving: m.procedure_type },
        typeOpdracht: { omschrijving: m.category },
        publicatiestatus: { omschrijving: m.status },
        link: { href: m.url },
      })),
      totalElements: mock.length,
      totalPages: mock.length > 0 ? 1 : 0,
      size: mock.length,
      number: 0,
      first: true,
      last: true,
    }
  }

  const base = getTnsBaseUrl()
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('size', String(size))
  const q = filters?.search?.trim()
  if (q) params.set('search', q)
  // Lege cpvCodes geeft bij TenderNed HTTP 400 ("must not be blank")
  const cpvForUrl = (filters?.cpvCodes ?? [])
    .map((c) => (typeof c === 'string' ? c.trim() : String(c).trim()))
    .filter((c) => /^\d{8}-\d$/.test(c))
  for (const code of cpvForUrl) {
    params.append('cpvCodes', code)
  }

  const url = `${base}/publicaties?${params.toString()}`
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 120 },
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    let msg = `TenderNed TNS: ${response.status} ${response.statusText}`
    try {
      const j = JSON.parse(errText) as { message?: string }
      if (j.message) msg = `TenderNed: ${j.message}`
    } catch {
      if (errText) msg = `${msg} — ${errText.slice(0, 200)}`
    }
    throw new Error(msg)
  }

  return response.json() as Promise<TnsPageResponse>
}

export async function fetchPublicationDetailJson(
  publicatieId: number
): Promise<unknown> {
  if (useTendernedMock()) {
    const m = getMockTenders().find((t) => t.id === String(publicatieId))
    if (m) {
      return {
        publicatieId,
        aanbestedingNaam: m.title,
        opdrachtgeverNaam: m.contracting_authority,
        opdrachtBeschrijving: m.description,
        sluitingsDatum: m.deadline,
        publicatieDatum: m.publication_date,
        procedureCode: { omschrijving: m.procedure_type },
        typeOpdrachtCode: { omschrijving: m.category },
        cpvCodes: m.cpv_codes.map((code) => ({ code })),
        nutsCodes: m.nuts_codes.map((code) => ({ code })),
        aanbestedingStatus: m.status,
        links: {
          shareOnLinkedIn: {
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(m.url)}`,
          },
        },
      }
    }
  }

  const base = getTnsBaseUrl()
  const url = `${base}/publicaties/${publicatieId}`
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(
      `TenderNed TNS detail: ${response.status} ${response.statusText} (${publicatieId})`
    )
  }

  return response.json()
}

export async function getPublicationAsTender(
  publicatieId: number
): Promise<TenderNedResult> {
  const raw = await fetchPublicationDetailJson(publicatieId)
  return mapDetailJsonToTender(raw)
}

// ——— Publicatie-documenten (bijlagen) ———

export interface TnsPublicationDocument {
  /** Hash-id uit TNS; soms ontbreekt deze in oudere responses */
  documentId?: string
  documentNaam: string
  typeDocument?: { code?: string; omschrijving?: string }
  grootte?: number
  virusIndicatie?: boolean
  links?: { download?: { href?: string } }
}

interface TnsDocumentenResponse {
  documenten?: TnsPublicationDocument[]
}

const MIME_BY_TNS_TYPE: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  txt: 'text/plain',
  zip: 'application/zip',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
}

export function mimeTypeFromTnsDocumentType(code: string | undefined): string {
  const c = (code ?? 'bin').toLowerCase()
  return MIME_BY_TNS_TYPE[c] ?? 'application/octet-stream'
}

/** Absolute download-URL voor een TNS `href` (vaak pad vanaf host). */
export function resolveTenderNedAssetUrl(href: string): string {
  const t = href.trim()
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  const origin = new URL(getTnsBaseUrl()).origin
  return new URL(t, `${origin}/`).toString()
}

export async function fetchPublicationDocumenten(
  publicatieId: number,
  options?: { cache?: RequestCache }
): Promise<TnsPublicationDocument[]> {
  if (useTendernedMock()) {
    return []
  }

  const base = getTnsBaseUrl()
  const url = `${base}/publicaties/${publicatieId}/documenten`
  const fetchInit: RequestInit & { next?: { revalidate: number } } = {
    headers: { Accept: 'application/json' },
  }
  if (options?.cache) {
    fetchInit.cache = options.cache
  } else {
    fetchInit.next = { revalidate: 120 }
  }
  const response = await fetch(url, fetchInit)

  if (!response.ok) {
    throw new Error(
      `TenderNed TNS documenten: ${response.status} ${response.statusText} (${publicatieId})`
    )
  }

  const data = (await response.json()) as TnsDocumentenResponse
  return data.documenten ?? []
}

/** Aantal bijlagen volgens TenderNed (zelfde endpoint als sync). */
export async function fetchPublicatieBijlagenCount(
  publicatieId: number
): Promise<number> {
  const docs = await fetchPublicationDocumenten(publicatieId)
  return docs.length
}

/** Alleen actief als `TENDERNED_USE_MOCK=true`. */
export function getMockTenders(): TenderNedResult[] {
  return [
    {
      id: 'demo-001',
      title: 'Demo tender (mock)',
      description:
        'Zet TENDERNED_USE_MOCK=false voor live data uit de openbare TenderNed-catalogus.',
      contracting_authority: 'Demo',
      deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
      publication_date: new Date(Date.now() - 7 * 86400000).toISOString(),
      value: 250000,
      currency: 'EUR',
      category: 'IT',
      url: 'https://www.tenderned.nl/aankondigingen/overzicht',
      cpv_codes: ['72000000'],
      nuts_codes: ['NL329'],
      procedure_type: 'Openbaar',
      status: 'Actief',
    },
  ]
}
