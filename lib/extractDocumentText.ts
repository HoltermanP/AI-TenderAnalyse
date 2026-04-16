import type { PdfParserForScreenshots } from '@/lib/pdfPageScreenshots'

const MAX_CHARS = 500_000

/** Minimale tekstlengte na extractie; gelijk aan drempel in extractiepaden hieronder. */
export const MIN_EXTRACTED_TEXT_CHARS = 20

const MAX_ZIP_ENTRIES_TO_TRY = 35
const MAX_ZIP_RECURSION_DEPTH = 2

type PdfParserForExtract = PdfParserForScreenshots & {
  getText: () => Promise<{ text?: string }>
  destroy: () => Promise<void>
}

async function runTesseractOnPngPages(pngs: Uint8Array[]): Promise<string | null> {
  if (!pngs.length) return null
  try {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('nld+eng')
    try {
      const parts: string[] = []
      for (let i = 0; i < pngs.length; i++) {
        const { data } = await worker.recognize(Buffer.from(pngs[i]))
        const t = data.text?.trim()
        if (t) parts.push(`--- Pagina ${i + 1} ---\n${t}`)
      }
      const joined = parts.join('\n\n').trim()
      return joined.length >= MIN_EXTRACTED_TEXT_CHARS ? joined : null
    } finally {
      await worker.terminate().catch(() => {})
    }
  } catch {
    return null
  }
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function isPkZipLocalHeader(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  )
}

function detectFileKind(
  buffer: Buffer,
  mime: string,
  fileName: string
): 'text' | 'pdf' | 'docx' | 'xlsx' | 'odt' | 'ods' | 'zip' | 'unknown' {
  const m = normalize(mime)
  const lower = normalize(fileName)
  const signature = buffer.subarray(0, 8)
  const isZip =
    signature.length >= 4 &&
    signature[0] === 0x50 &&
    signature[1] === 0x4b &&
    signature[2] === 0x03 &&
    signature[3] === 0x04
  const isPdf =
    signature.length >= 4 &&
    signature[0] === 0x25 &&
    signature[1] === 0x50 &&
    signature[2] === 0x44 &&
    signature[3] === 0x46

  if (m === 'text/plain' || m.startsWith('text/')) return 'text'
  if (m === 'application/pdf' || lower.endsWith('.pdf') || isPdf) return 'pdf'
  if (
    m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx')
  ) {
    return 'docx'
  }
  if (
    m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    m === 'application/vnd.ms-excel' ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls')
  ) {
    return 'xlsx'
  }
  if (
    m === 'application/vnd.oasis.opendocument.text' ||
    lower.endsWith('.odt')
  ) {
    return 'odt'
  }
  if (
    m === 'application/vnd.oasis.opendocument.spreadsheet' ||
    lower.endsWith('.ods')
  ) {
    return 'ods'
  }
  if (
    m === 'application/zip' ||
    m === 'application/x-zip-compressed' ||
    lower.endsWith('.zip')
  ) {
    return 'zip'
  }

  if (isZip) {
    if (lower.endsWith('.docx')) return 'docx'
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'xlsx'
    if (lower.endsWith('.odt')) return 'odt'
    if (lower.endsWith('.ods')) return 'ods'
    if (lower.endsWith('.zip')) return 'zip'
  }

  if (
    m === 'application/octet-stream' ||
    m === 'binary/octet-stream' ||
    m === '' ||
    m === 'application/unknown'
  ) {
    if (!isZip && !isPdf) return 'text'
  }

  return 'unknown'
}

function normalizeZipEntryPath(raw: string): string | null {
  const p = raw.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!p || p.includes('..')) return null
  return p
}

function guessMimeFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (lower.endsWith('.doc')) return 'application/msword'
  if (lower.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel'
  if (lower.endsWith('.txt') || lower.endsWith('.csv')) return 'text/plain'
  if (lower.endsWith('.odt')) return 'application/vnd.oasis.opendocument.text'
  if (lower.endsWith('.ods')) return 'application/vnd.oasis.opendocument.spreadsheet'
  if (lower.endsWith('.zip')) return 'application/zip'
  return 'application/octet-stream'
}

/** Sorteert zodat PvE, leidraad e.d. vóóraan in de gecombineerde tekst staan (belangrijk voor AI-slices). */
function tenderInnerFileSortScore(path: string): number {
  const lower = path.toLowerCase().replace(/\\/g, '/')
  let score = 0
  if (lower.endsWith('.pdf')) score += 100
  else if (lower.endsWith('.docx')) score += 95
  else if (lower.endsWith('.doc')) score += 85
  else if (lower.endsWith('.odt')) score += 85
  else if (lower.endsWith('.ods')) score += 80
  else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) score += 75
  else if (lower.endsWith('.txt') || lower.endsWith('.csv')) score += 50

  const keys = [
    'leidraad',
    'aanbestedingsleidraad',
    'programma',
    'eisen',
    'pve',
    'raamovereenkomst',
    'raam',
    'concept',
    'contract',
    'voorwaarden',
    'kwalificatie',
    'inschrij',
    'nota',
  ]
  for (const k of keys) {
    if (lower.includes(k)) score += 12
  }
  return score
}

async function tryMammothExtractDocx(buffer: Buffer): Promise<string | null> {
  try {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value?.trim()
    return text && text.length >= MIN_EXTRACTED_TEXT_CHARS ?
        text.slice(0, MAX_CHARS)
      : null
  } catch {
    return null
  }
}

async function extractFromOpenDocumentContentXml(buffer: Buffer): Promise<string | null> {
  try {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(buffer)
    const xml = await zip.file('content.xml')?.async('text')
    if (!xml) return null
    const text = xml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim()
    return text.length >= MIN_EXTRACTED_TEXT_CHARS ? text.slice(0, MAX_CHARS) : null
  } catch {
    return null
  }
}

async function extractFromZipArchive(
  buffer: Buffer,
  zipDepth: number
): Promise<string | null> {
  if (zipDepth > MAX_ZIP_RECURSION_DEPTH) return null
  try {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(buffer)
    const items: { safePath: string; asyncBuffer: () => Promise<Buffer> }[] = []

    zip.forEach((relativePath, entry) => {
      if (entry.dir) return
      const normalized = normalizeZipEntryPath(relativePath)
      if (!normalized) return
      const base = normalized.split('/').pop() ?? ''
      if (base.startsWith('._') || base === '.DS_Store') return
      if (normalized.toLowerCase().includes('__macosx/')) return
      items.push({
        safePath: normalized,
        asyncBuffer: async () => Buffer.from(await entry.async('uint8array')),
      })
    })

    if (!items.length) return null

    items.sort(
      (a, b) => tenderInnerFileSortScore(b.safePath) - tenderInnerFileSortScore(a.safePath)
    )

    const parts: string[] = []
    let total = 0
    for (const it of items.slice(0, MAX_ZIP_ENTRIES_TO_TRY)) {
      const buf = await it.asyncBuffer()
      if (buf.length < 8) continue
      const mime = guessMimeFromFileName(it.safePath)
      const inner = await extractTextFromBuffer(buf, mime, it.safePath, zipDepth + 1)
      if (!inner || inner.trim().length < MIN_EXTRACTED_TEXT_CHARS) continue
      const block = `--- ${it.safePath} ---\n${inner}`
      if (total + block.length > MAX_CHARS) {
        if (total === 0) parts.push(block.slice(0, MAX_CHARS))
        break
      }
      parts.push(block)
      total += block.length
    }
    const joined = parts.join('\n\n').trim()
    return joined.length >= MIN_EXTRACTED_TEXT_CHARS ? joined.slice(0, MAX_CHARS) : null
  } catch {
    return null
  }
}

/**
 * TenderNed levert soms generieke `bin/octet-stream` terwijl het een docx-zip of bundel-zip is.
 */
async function extractFromUnknownZipLikeBuffer(
  buffer: Buffer,
  zipDepth: number
): Promise<string | null> {
  if (zipDepth > MAX_ZIP_RECURSION_DEPTH || !isPkZipLocalHeader(buffer)) return null
  try {
    const JSZip = (await import('jszip')).default
    const z = await JSZip.loadAsync(buffer)
    if (z.file('word/document.xml')) {
      const docxText = await tryMammothExtractDocx(buffer)
      if (docxText) return docxText
    }
    const manifest = z.file('META-INF/manifest.xml')
    const content = z.file('content.xml')
    if (manifest && content) {
      const odtText = await extractFromOpenDocumentContentXml(buffer)
      if (odtText) return odtText
    }
    return extractFromZipArchive(buffer, zipDepth)
  } catch {
    return null
  }
}

export function isPdfDocument(buffer: Buffer, mime: string, fileName: string): boolean {
  return detectFileKind(buffer, mime, fileName) === 'pdf'
}

export function isZipBuffer(buffer: Buffer): boolean {
  return isPkZipLocalHeader(buffer)
}

/**
 * Extraheert de eerste 'belangrijke' PDF uit een ZIP-bundel (gesorteerd op relevantie).
 * Bruikbaar als vision-fallback voor ZIP-bijlagen die geen leesbare tekst bevatten
 * (bijv. bundels met gescande PDFs).
 * Geeft null terug als de ZIP geen PDFs bevat of niet geopend kan worden.
 */
export async function extractFirstPdfFromZip(buffer: Buffer): Promise<Buffer | null> {
  if (!isPkZipLocalHeader(buffer)) return null
  try {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(buffer)

    const pdfPaths: string[] = []
    zip.forEach((relativePath, entry) => {
      if (entry.dir) return
      const normalized = normalizeZipEntryPath(relativePath)
      if (!normalized) return
      if (normalized.toLowerCase().endsWith('.pdf')) {
        pdfPaths.push(normalized)
      }
    })

    if (!pdfPaths.length) return null

    // Sorteer op relevantie (leidraad/pve vóór overige bijlagen)
    pdfPaths.sort((a, b) => tenderInnerFileSortScore(b) - tenderInnerFileSortScore(a))

    const entry = zip.file(pdfPaths[0])
    if (!entry) return null

    const data = await entry.async('uint8array')
    return Buffer.from(data)
  } catch {
    return null
  }
}

/**
 * Haalt platte tekst uit tenderbijlagen: PDF, Office, plain text, ZIP-bundels (TenderNed), OpenDocument.
 * PDF: eerst tekstlaag (pdf-parse), daarna OCR (Tesseract) op gerenderde pagina’s als tekst te kort ontbreekt.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mime: string,
  fileName: string,
  zipDepth = 0
): Promise<string | null> {
  const kind = detectFileKind(buffer, mime, fileName)

  if (kind === 'zip') {
    return extractFromZipArchive(buffer, zipDepth)
  }

  if (kind === 'odt' || kind === 'ods') {
    return extractFromOpenDocumentContentXml(buffer)
  }

  if (kind === 'unknown' && isPkZipLocalHeader(buffer)) {
    return extractFromUnknownZipLikeBuffer(buffer, zipDepth)
  }

  if (kind === 'text') {
    try {
      const text = buffer.toString('utf-8').replace(/\u0000/g, '').trim()
      return text.length >= MIN_EXTRACTED_TEXT_CHARS ?
          text.slice(0, MAX_CHARS)
        : null
    } catch {
      return null
    }
  }

  if (kind === 'pdf') {
    let parser: PdfParserForExtract | null = null
    try {
      const { PDFParse } = await import('pdf-parse')
      parser = new PDFParse({ data: new Uint8Array(buffer) }) as PdfParserForExtract

      let plain = ''
      try {
        const data = await parser.getText()
        plain = data.text?.trim() ?? ''
      } catch {
        plain = ''
      }

      if (plain.length >= MIN_EXTRACTED_TEXT_CHARS) {
        return plain.slice(0, MAX_CHARS)
      }

      /**
       * OCR (Tesseract) kost veel geheugen en CPU. Voor geneste PDFs (in een ZIP-bundel)
       * slaan we OCR over om OOM in serverless te voorkomen. De buitenste laag kan
       * daarna vision-fallback gebruiken als de ZIP geen tekst opleverde.
       */
      if (zipDepth > 0) return null

      const maxOcrPages = Math.min(
        Math.max(1, Number(process.env.PDF_OCR_MAX_PAGES) || 12),
        24
      )
      const { renderPdfPagesWithParser } = await import('@/lib/pdfPageScreenshots')
      const pngs = await renderPdfPagesWithParser(parser, maxOcrPages, { scale: 1.5 })
      const ocr = await runTesseractOnPngPages(pngs)
      if (ocr && ocr.length >= MIN_EXTRACTED_TEXT_CHARS) {
        return ocr.slice(0, MAX_CHARS)
      }

      return null
    } catch {
      return null
    } finally {
      if (parser) {
        try {
          await parser.destroy()
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }

  if (kind === 'docx') {
    const text = await tryMammothExtractDocx(buffer)
    if (text) return text
    return null
  }

  if (kind === 'xlsx') {
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const parts: string[] = []
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName]
        if (sheet) parts.push(XLSX.utils.sheet_to_csv(sheet))
      }
      const joined = parts.join('\n\n').trim()
      return joined && joined.length >= MIN_EXTRACTED_TEXT_CHARS ?
          joined.slice(0, MAX_CHARS)
        : null
    } catch {
      return null
    }
  }

  return null
}
