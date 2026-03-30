/**
 * GAMMA Presentation API integration
 * GAMMA is an AI-powered presentation platform.
 * https://gamma.app
 */

export interface GammaSlide {
  title: string
  content: string
  type?: 'title' | 'content' | 'stats' | 'quote'
}

export interface GammaPresentationInput {
  title: string
  slides: GammaSlide[]
  theme?: string
}

export interface GammaPresentationResult {
  id: string
  url: string
  embed_url: string
  title: string
}

const GAMMA_API_URL = process.env.GAMMA_API_URL ?? 'https://api.gamma.app'

export async function createPresentation(
  input: GammaPresentationInput
): Promise<GammaPresentationResult> {
  if (!process.env.GAMMA_API_KEY) {
    throw new Error('GAMMA_API_KEY is not configured')
  }

  const response = await fetch(`${GAMMA_API_URL}/presentations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GAMMA_API_KEY}`,
    },
    body: JSON.stringify({
      title: input.title,
      theme: input.theme ?? 'dark',
      slides: input.slides,
    }),
  })

  if (!response.ok) {
    throw new Error(
      `GAMMA API error: ${response.status} ${response.statusText}`
    )
  }

  return response.json() as Promise<GammaPresentationResult>
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
