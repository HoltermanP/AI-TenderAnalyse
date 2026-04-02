import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { renderPdfFirstPagesPng } from '@/lib/pdfPageScreenshots'
import { getToneOfVoiceInstruction } from '@/lib/toneOfVoice'
import type { AnalysisDocumentCoverage } from '@/lib/analysisDocumentCoverage'

// apiKey defaults to process.env.ANTHROPIC_API_KEY — throws at call time if missing
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
})

export const MODEL = 'claude-opus-4-6'

export interface TenderAnalysisInput {
  tender: {
    title: string
    description: string
    contracting_authority: string
    deadline: string
    value?: number
    category?: string
    publication_date?: string | null
    currency?: string | null
    url?: string | null
    external_id?: string | null
    source?: string
    tenderned_bijlagen_count?: number | null
  }
  companyInfo: {
    name: string
    description: string
    strengths: string[]
    certifications: string[]
    sectors: string[]
    legalForm?: string
    addressBlock?: string
    vatNumber?: string
    contactBlock?: string
    cpvFocus: string[]
    referenceProjects?: string
    differentiators?: string
    strategicNotes?: string
    revenueRange?: string
    employeeCount?: string
    foundedYear?: number | null
    website?: string
    kvkNumber?: string
  }
  /** Per bijlage: naam + AI-samenvatting (incl. TenderNed-bijlagen op blob) */
  documentSummaries?: Array<{ name: string; summary: string }>
  /** Handmatig geüploade bedrijfsdocumenten (strategie, jaarplan, …) */
  companyDocumentSummaries?: Array<{ name: string; summary: string }>
  lessonsLearned?: string[]
  /** Per tender: beïnvloedt formulering van analyse (tekstvelden in JSON) */
  toneOfVoice?: string | null
  /** Feiten over verwerkte bijlagen (voorkomt foute conclusies bij gedeeltelijke sync) */
  documentCoverage?: AnalysisDocumentCoverage | null
}

export interface TenderAnalysisResult {
  score: number
  recommendation: 'bid' | 'no_bid' | 'review'
  summary: string
  strengths: string[]
  weaknesses: string[]
  risks: string[]
  opportunities: string[]
  win_probability: number
  effort_estimate: string
}

/** Zet database `company_info` om naar de structuur voor de AI-prompt. */
export function companyInfoFromDb(row: {
  name: string
  description?: string | null
  strengths?: string[] | null
  certifications?: string[] | null
  sectors?: string[] | null
  revenue_range?: string | null
  employee_count?: string | null
  founded_year?: number | null
  website?: string | null
  kvk_number?: string | null
  legal_form?: string | null
  address_line?: string | null
  postal_code?: string | null
  city?: string | null
  country?: string | null
  vat_number?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  cpv_focus?: string[] | null
  reference_projects?: string | null
  differentiators?: string | null
  strategic_notes?: string | null
}): TenderAnalysisInput['companyInfo'] {
  const addrParts = [
    row.address_line?.trim(),
    [row.postal_code?.trim(), row.city?.trim()].filter(Boolean).join(' '),
    row.country?.trim() || 'Nederland',
  ].filter((p) => p && String(p).length > 0)
  const addressBlock = addrParts.join('\n')

  const contactParts = [
    row.contact_name?.trim(),
    row.contact_email?.trim(),
    row.contact_phone?.trim(),
  ].filter(Boolean)
  const contactBlock = contactParts.join(' · ')

  return {
    name: row.name,
    description: row.description ?? '',
    strengths: row.strengths ?? [],
    certifications: row.certifications ?? [],
    sectors: row.sectors ?? [],
    legalForm: row.legal_form ?? undefined,
    addressBlock: addressBlock || undefined,
    vatNumber: row.vat_number ?? undefined,
    contactBlock: contactBlock || undefined,
    cpvFocus: row.cpv_focus ?? [],
    referenceProjects: row.reference_projects ?? undefined,
    differentiators: row.differentiators ?? undefined,
    strategicNotes: row.strategic_notes ?? undefined,
    revenueRange: row.revenue_range ?? undefined,
    employeeCount: row.employee_count ?? undefined,
    foundedYear: row.founded_year ?? null,
    website: row.website ?? undefined,
    kvkNumber: row.kvk_number ?? undefined,
  }
}

function buildCompanyInfoPrompt(
  c: TenderAnalysisInput['companyInfo']
): string {
  const lines: string[] = [
    `Bedrijf: ${c.name}`,
    c.legalForm ? `Rechtsvorm: ${c.legalForm}` : '',
    `Beschrijving: ${c.description}`,
  ]
  if (c.addressBlock?.trim()) {
    lines.push(`Vestiging:\n${c.addressBlock.trim()}`)
  }
  lines.push(
    `KVK: ${c.kvkNumber ?? '—'} | BTW: ${c.vatNumber ?? '—'}`,
    `Website: ${c.website ?? '—'}`,
    `Omzet (range): ${c.revenueRange ?? '—'} | Medewerkers (range): ${c.employeeCount ?? '—'} | Opgericht: ${c.foundedYear ?? '—'}`
  )
  if (c.contactBlock?.trim()) {
    lines.push(`Contact:\n${c.contactBlock.trim()}`)
  }
  lines.push(
    `Sterktes: ${c.strengths.join(', ')}`,
    `Certificeringen: ${c.certifications.join(', ')}`,
    `Sectoren: ${c.sectors.join(', ')}`,
    `CPV-focus (eigen keuze): ${c.cpvFocus.length ? c.cpvFocus.join(', ') : '—'}`,
    `Referentieprojecten / track record:\n${c.referenceProjects?.trim() || '—'}`,
    `Onderscheidend vermogen / USP:\n${c.differentiators?.trim() || '—'}`,
    `Strategie & aandachtspunten:\n${c.strategicNotes?.trim() || '—'}`
  )
  return lines.filter(Boolean).join('\n\n')
}

export async function analyseTender(
  input: TenderAnalysisInput
): Promise<TenderAnalysisResult> {
  const toneLine = getToneOfVoiceInstruction(input.toneOfVoice)
  const systemPrompt = `Je bent een expert tender-analist voor een Nederlands bedrijf.
Analyseer de tender grondig en geef een gestructureerde beoordeling terug in JSON formaat.
Wees objectief, concreet en gebruik beschikbare informatie maximaal.
Geef altijd een score van 0-100 en een duidelijke aanbeveling.
Tone of voice voor alle tekstuele velden in de JSON (samenvatting, arrays, effort_estimate): ${toneLine}`

  const extraTenderLines = [
    input.tender.publication_date
      ? `Publicatiedatum: ${input.tender.publication_date}`
      : null,
    input.tender.value != null
      ? `Waarde: ${input.tender.currency === 'EUR' || !input.tender.currency ? `€${input.tender.value.toLocaleString('nl-NL')}` : `${input.tender.value} ${input.tender.currency ?? ''}`}`
      : null,
    input.tender.category ? `Categorie: ${input.tender.category}` : null,
    input.tender.url ? `Tenderlink: ${input.tender.url}` : null,
    input.tender.external_id ? `Extern ID: ${input.tender.external_id}` : null,
    input.tender.source ? `Bron: ${input.tender.source}` : null,
    input.tender.tenderned_bijlagen_count != null
      ? `Aantal TenderNed-documenten (catalogus): ${input.tender.tenderned_bijlagen_count}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')

  const bijlagenBlock =
    input.documentSummaries?.length ?
      `BIJLAGEN (blob / documentstore, per bestand):\n${input.documentSummaries
        .map((d) => `### ${d.name}\n${d.summary}`)
        .join('\n\n')}`
    : ''

  const bedrijfsDocsBlock =
    input.companyDocumentSummaries?.length ?
      `BEDRIJFSDOCUMENTEN (geüpload):\n${input.companyDocumentSummaries
        .map((d) => `### ${d.name}\n${d.summary}`)
        .join('\n\n')}`
    : ''

  const c = input.documentCoverage
  const coverageBlock =
    c ?
      `DOCUMENTDEKKING (feitelijk, database + TenderNed-catalogus):
- TenderNed-catalogus: ${c.catalogCount != null ? `${c.catalogCount} documenten` : 'niet bekend'}
- Bijlagen gekoppeld aan deze tender in de app: ${c.inAppTotal}
- Opgeslagen op Blob (synced): ${c.syncedBlob}
- Met bruikbare AI-samenvatting in deze analyse: ${c.usableForAnalysis}
${c.issueLines.length ? `- Verwerking niet geslaagd of onvolledig: ${c.issueLines.join('; ')}` : ''}
(Hanteer deze aantallen strikt. Als het aantal bruikbare samenvattingen lager is dan de catalogus, geef dat technisch/neutraal weer — geen aanname dat ontbrekende stukken “nog opgevraagd” kunnen worden tenzij dat in de input staat.)
`
    : ''

  const userPrompt = `Analyseer de volgende tender.
Formuleer de waarden van de JSON-tekstvelden consequent volgens de tone of voice uit de systeeminstructie.
Gebruik alleen informatie die expliciet in de input staat. Verzin geen specifieke ontbrekende documenttypen.
Als informatie ontbreekt, benoem dit neutraal en feitelijk op basis van de beschikbare context.

TENDER INFORMATIE:
Titel: ${input.tender.title}
Beschrijving: ${input.tender.description}
Aanbestedende dienst: ${input.tender.contracting_authority}
Deadline: ${input.tender.deadline}
${extraTenderLines}

BEDRIJFSINFORMATIE:
${buildCompanyInfoPrompt(input.companyInfo)}

${bedrijfsDocsBlock}

${coverageBlock}

${bijlagenBlock}

${input.lessonsLearned?.length ? `LESSONS LEARNED:\n${input.lessonsLearned.join('\n\n')}` : ''}

Geef de analyse terug als JSON met dit formaat:
{
  "score": <0-100>,
  "recommendation": "bid" | "no_bid" | "review",
  "summary": "<samenvatting>",
  "strengths": ["<sterkte1>", "<sterkte2>"],
  "weaknesses": ["<zwakte1>", "<zwakte2>"],
  "risks": ["<risico1>", "<risico2>"],
  "opportunities": ["<kans1>", "<kans2>"],
  "win_probability": <0-100>,
  "effort_estimate": "<laag|gemiddeld|hoog> - <korte toelichting, maximaal ca. 500 tekens>"
}`

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response')
  }

  return JSON.parse(jsonMatch[0]) as TenderAnalysisResult
}

export async function* streamChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt?: string
): AsyncGenerator<string> {
  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: 4096,
    system:
      systemPrompt ??
      `Je bent een AI-assistent gespecialiseerd in tender-analyse en aanbestedingen.
Je helpt medewerkers bij het analyseren van tenders, het beoordelen van kansen en het opstellen van biedstrategieën.
Antwoord altijd in het Nederlands, tenzij de gebruiker een andere taal vraagt.`,
    messages,
  })

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      yield chunk.delta.text
    }
  }
}

export async function summariseDocument(content: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Maak een beknopte samenvatting van dit document voor tender-analyse doeleinden. Focus op: vereisten, criteria, deadlines, budget, en relevante specificaties.\n\nDocument:\n${content}`,
      },
    ],
  })

  const result = message.content[0]
  if (result.type !== 'text') throw new Error('Unexpected response type')
  return result.text
}

/** Samenvatting voor geüploade bedrijfsdocumenten (jaarplan, strategie, visie, …). */
export async function summariseCompanyProfileDocument(
  content: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Maak een beknopte samenvatting van dit bedrijfsdocument voor gebruik bij tender- en bid-analyse. Focus op: strategische prioriteiten, kerncompetenties, doelen, markt/sectoren, capaciteit, innovatie, duurzaamheid, en alles wat helpt om te bepalen of een aanbesteding past bij het bedrijf. Antwoord in het Nederlands.\n\nDocument:\n${content}`,
      },
    ],
  })

  const result = message.content[0]
  if (result.type !== 'text') throw new Error('Unexpected response type')
  return result.text
}

function pdfVisionMaxPages(): number {
  return Math.min(Math.max(1, Number(process.env.PDF_VISION_MAX_PAGES) || 8), 12)
}

async function summarisePdfFromVisionWithInstruction(
  pdfBuffer: Buffer,
  instruction: string
): Promise<string> {
  const pngs = await renderPdfFirstPagesPng(pdfBuffer, pdfVisionMaxPages(), {
    desiredWidth: 1100,
  })
  if (!pngs.length) throw new Error('Geen PDF-pagina’s gerenderd voor vision')

  const content: MessageParam['content'] = [
    { type: 'text', text: instruction },
    ...pngs.map((png) => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: 'image/png' as const,
        data: Buffer.from(png).toString('base64'),
      },
    })),
  ]

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1536,
    messages: [{ role: 'user', content }],
  })
  const result = message.content[0]
  if (result.type !== 'text') throw new Error('Unexpected response type')
  return result.text
}

/**
 * Laatste redmiddel als tekst + OCR onvoldoende opleveren: eerste pagina’s als PNG naar Claude (vision).
 * Gebruikt dezelfde Anthropic API-key; geen OpenAI nodig.
 */
export async function summariseTenderPdfFromVision(pdfBuffer: Buffer): Promise<string> {
  const instruction =
    `Je ziet rasterafbeeldingen van de eerste pagina's van een PDF-bijlage bij een aanbesteding. ` +
    `Er kon onvoldoende betrouwbare platte tekst uit het bestand worden gehaald (bijv. scan of complexe lay-out). ` +
    `Lees wat zichtbaar is (koppen, tabellen, voorwaarden, data) en maak een beknopte samenvatting voor tender-analyse: ` +
    `vereisten, gunningcriteria, deadlines, prijs/budget, risico's, relevante specificaties. Antwoord in het Nederlands.`
  return summarisePdfFromVisionWithInstruction(pdfBuffer, instruction)
}

export async function summariseCompanyPdfFromVision(pdfBuffer: Buffer): Promise<string> {
  const instruction =
    `Je ziet rasterafbeeldingen van de eerste pagina's van een bedrijfs-PDF. ` +
    `Platte tekstextractie (inclusief OCR) leverde te weinig op. ` +
    `Vat samen wat relevant is voor bid-analyse: strategie, competenties, doelen, sectoren, capaciteit. Antwoord in het Nederlands.`
  return summarisePdfFromVisionWithInstruction(pdfBuffer, instruction)
}
