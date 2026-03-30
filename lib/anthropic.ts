import Anthropic from '@anthropic-ai/sdk'

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
  }
  companyInfo: {
    name: string
    description: string
    strengths: string[]
    certifications: string[]
    sectors: string[]
  }
  documents?: string[]
  lessonsLearned?: string[]
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

export async function analyseTender(
  input: TenderAnalysisInput
): Promise<TenderAnalysisResult> {
  const systemPrompt = `Je bent een expert tender-analist voor een Nederlands bedrijf.
Analyseer de tender grondig en geef een gestructureerde beoordeling terug in JSON formaat.
Wees objectief, concreet en gebruik beschikbare informatie maximaal.
Geef altijd een score van 0-100 en een duidelijke aanbeveling.`

  const userPrompt = `Analyseer de volgende tender:

TENDER INFORMATIE:
Titel: ${input.tender.title}
Beschrijving: ${input.tender.description}
Aanbestedende dienst: ${input.tender.contracting_authority}
Deadline: ${input.tender.deadline}
${input.tender.value ? `Waarde: €${input.tender.value.toLocaleString('nl-NL')}` : ''}
${input.tender.category ? `Categorie: ${input.tender.category}` : ''}

BEDRIJFSINFORMATIE:
Bedrijf: ${input.companyInfo.name}
Beschrijving: ${input.companyInfo.description}
Sterktes: ${input.companyInfo.strengths.join(', ')}
Certificeringen: ${input.companyInfo.certifications.join(', ')}
Sectoren: ${input.companyInfo.sectors.join(', ')}

${input.documents?.length ? `DOCUMENTEN:\n${input.documents.join('\n\n')}` : ''}

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
  "effort_estimate": "<laag|gemiddeld|hoog> - <toelichting>"
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
