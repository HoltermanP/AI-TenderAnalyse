import { z } from 'zod'

/** Vaste keuzes; id wordt opgeslagen in `tenders.tone_of_voice`. */
export const TONE_OF_VOICE_IDS = [
  'professional',
  'formal',
  'warm',
  'concise',
  'persuasive',
  'technical',
] as const

export type ToneOfVoiceId = (typeof TONE_OF_VOICE_IDS)[number]

export const toneOfVoiceIdSchema = z.enum(TONE_OF_VOICE_IDS)

export const TONE_OF_VOICE_OPTIONS: ReadonlyArray<{
  id: ToneOfVoiceId
  label: string
  hint: string
}> = [
  {
    id: 'professional',
    label: 'Zakelijk professioneel',
    hint: 'Duidelijk, neutraal, vertrouwenwekkend',
  },
  {
    id: 'formal',
    label: 'Formeel',
    hint: 'Streng, juridisch en procedureel precies',
  },
  {
    id: 'warm',
    label: 'Warm en betrokken',
    hint: 'Menselijk, samenwerkingsgericht, nog steeds professioneel',
  },
  {
    id: 'concise',
    label: 'Beknopt en direct',
    hint: 'Korte zinnen, feiten eerst, weinig opsmuk',
  },
  {
    id: 'persuasive',
    label: 'Overtuigend',
    hint: 'Commercieel sterk, nadruk op waarde en onderscheidend vermogen',
  },
  {
    id: 'technical',
    label: 'Technisch en feitelijk',
    hint: 'Specifiek, exacte termen, minimaal marketingtaal',
  },
]

const INSTRUCTIONS: Record<ToneOfVoiceId, string> = {
  professional:
    'Zakelijk professioneel: helder, neutraal en betrouwbaar; geen overdreven marketingtaal.',
  formal:
    'Formeel: aanspreekvorm en zinsbouw passend bij officiële aanbestedingscorrespondentie; juridisch en procedureel nauwkeurig.',
  warm:
    'Warm en betrokken: menselijk en samenwerkingsgericht, zonder informeel of slordig te worden.',
  concise:
    'Beknopt en direct: korte alinea’s en zinnen, kernpunten eerst, weinig herhaling.',
  persuasive:
    'Overtuigend: benadruk waarde, differentiatie en geschiktheid van het bedrijf, zonder onwaarheden.',
  technical:
    'Technisch en feitelijk: exacte terminologie, specificaties en meetbare criteria waar relevant.',
}

export function normalizeToneOfVoiceId(
  raw: string | null | undefined
): ToneOfVoiceId {
  if (!raw) return 'professional'
  const parsed = toneOfVoiceIdSchema.safeParse(raw)
  return parsed.success ? parsed.data : 'professional'
}

/** Korte instructie voor systeemprompts (Nederlands). */
export function getToneOfVoiceInstruction(
  raw: string | null | undefined
): string {
  return INSTRUCTIONS[normalizeToneOfVoiceId(raw)]
}

export function toneOfVoiceLabel(raw: string | null | undefined): string {
  const id = normalizeToneOfVoiceId(raw)
  return TONE_OF_VOICE_OPTIONS.find((o) => o.id === id)?.label ?? id
}
