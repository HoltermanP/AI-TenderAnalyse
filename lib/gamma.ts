/**
 * GAMMA Presentation API integration
 * https://developers.gamma.app/docs
 */

export interface GammaSlide {
  title: string
  content: string
  type?: 'title' | 'content' | 'stats' | 'quote'
}

export interface GammaPresentationInput {
  title: string
  slides: GammaSlide[]
  /** Alleen gebruikt als GAMMA_THEME_ID niet in env staat; Gamma verwacht een themeId, geen naam. */
  theme?: string
}

export interface GammaPresentationResult {
  id: string
  url: string
  embed_url: string
  title: string
}

const DEFAULT_GAMMA_BASE = 'https://public-api.gamma.app'
const POLL_INTERVAL_MS = 5000
const MAX_POLL_ATTEMPTS = 72

function gammaBaseUrl(): string {
  const raw = process.env.GAMMA_API_URL ?? DEFAULT_GAMMA_BASE
  return raw.replace(/\/$/, '')
}

function presentationToInputText(input: GammaPresentationInput): string {
  const parts = input.slides.map((slide) => {
    const heading =
      slide.type === 'title' ? `# ${slide.title}` : `## ${slide.title}`
    return `${heading}\n\n${slide.content.trim()}`
  })
  return parts.join('\n---\n')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface GammaGenerationStart {
  generationId: string
}

interface GammaGenerationStatus {
  generationId: string
  status: 'pending' | 'completed' | 'failed'
  gammaUrl?: string
  error?: unknown
}

export async function createPresentation(
  input: GammaPresentationInput
): Promise<GammaPresentationResult> {
  const apiKey = process.env.GAMMA_API_KEY
  if (!apiKey) {
    throw new Error('GAMMA_API_KEY is not configured')
  }

  const base = gammaBaseUrl()
  const inputText = presentationToInputText(input)

  const body: Record<string, unknown> = {
    inputText,
    textMode: 'preserve',
    format: 'presentation',
    cardSplit: 'inputTextBreaks',
    numCards: Math.min(75, Math.max(1, input.slides.length)),
  }

  const themeId = process.env.GAMMA_THEME_ID?.trim()
  if (themeId) {
    body.themeId = themeId
  }

  const startRes = await fetch(`${base}/v1.0/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!startRes.ok) {
    const detail = await startRes.text().catch(() => '')
    throw new Error(
      `GAMMA API error: ${startRes.status} ${startRes.statusText}${detail ? ` — ${detail.slice(0, 200)}` : ''}`
    )
  }

  const { generationId } = (await startRes.json()) as GammaGenerationStart
  if (!generationId) {
    throw new Error('GAMMA API: geen generationId in antwoord')
  }

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS)

    const statusRes = await fetch(`${base}/v1.0/generations/${generationId}`, {
      headers: { 'X-API-KEY': apiKey },
    })

    if (!statusRes.ok) {
      throw new Error(
        `GAMMA API error: ${statusRes.status} ${statusRes.statusText}`
      )
    }

    const result = (await statusRes.json()) as GammaGenerationStatus

    if (result.status === 'completed') {
      const url = result.gammaUrl ?? ''
      if (!url) {
        throw new Error('GAMMA API: voltooid maar geen gammaUrl')
      }
      return {
        id: generationId,
        url,
        embed_url: url,
        title: input.title,
      }
    }

    if (result.status === 'failed') {
      const errMsg =
        result.error !== undefined
          ? typeof result.error === 'string'
            ? result.error
            : JSON.stringify(result.error)
          : 'onbekende fout'
      throw new Error(`GAMMA generatie mislukt: ${errMsg}`)
    }
  }

  throw new Error(
    'GAMMA generatie duurt te lang (timeout). Probeer later opnieuw.'
  )
}

export function buildTenderPresentation(
  tender: {
    title: string
    contracting_authority: string
    value?: number
    deadline: string
  },
  analysis: {
    score: number
    recommendation: string
    summary: string
    strengths: string[]
    weaknesses: string[]
    risks: string[]
    opportunities: string[]
    win_probability: number
  },
  companyName: string
): GammaPresentationInput {
  return {
    title: `Tender Analyse: ${tender.title}`,
    slides: [
      {
        type: 'title',
        title: tender.title,
        content: `Aanbestedende dienst: ${tender.contracting_authority}\n${companyName} — Tender Analyse Rapport`,
      },
      {
        type: 'stats',
        title: 'Samenvatting Scores',
        content: `Winkans Score: ${analysis.score}/100\nAanbeveling: ${analysis.recommendation}\nWinkans: ${analysis.win_probability}%`,
      },
      {
        type: 'content',
        title: 'Analyse Samenvatting',
        content: analysis.summary,
      },
      {
        type: 'content',
        title: 'Sterktes & Kansen',
        content: [
          '**Sterktes:**',
          ...analysis.strengths.map((s) => `• ${s}`),
          '',
          '**Kansen:**',
          ...analysis.opportunities.map((o) => `• ${o}`),
        ].join('\n'),
      },
      {
        type: 'content',
        title: 'Zwaktes & Risicos',
        content: [
          '**Zwaktes:**',
          ...analysis.weaknesses.map((w) => `• ${w}`),
          '',
          '**Risicos:**',
          ...analysis.risks.map((r) => `• ${r}`),
        ].join('\n'),
      },
      {
        type: 'quote',
        title: 'Aanbeveling',
        content: `Aanbeveling: **${analysis.recommendation.toUpperCase()}**\n\nGebaseerd op een score van ${analysis.score}/100 en een geschatte winkans van ${analysis.win_probability}%.`,
      },
    ],
  }
}
