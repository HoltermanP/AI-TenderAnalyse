const MAX_CHARS = 500_000

/** Minimale tekstlengte na extractie; gelijk aan drempel in extractiepaden hieronder. */
export const MIN_EXTRACTED_TEXT_CHARS = 20

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function detectFileKind(
  buffer: Buffer,
  mime: string,
  fileName: string
): 'text' | 'pdf' | 'docx' | 'xlsx' | 'unknown' {
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

  // Some uploads are stored with generic content-types. Use known signatures as fallback.
  if (isZip) {
    if (lower.endsWith('.docx')) return 'docx'
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'xlsx'
  }

  // Generic MIME types can still contain plain UTF-8 text payloads.
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

/**
 * Haalt platte tekst uit ondersteunde tenderbijlagen (PDF, plain text, Word, Excel).
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mime: string,
  fileName: string
): Promise<string | null> {
  const kind = detectFileKind(buffer, mime, fileName)

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
    let parser: { getText: () => Promise<{ text?: string }>; destroy: () => Promise<void> } | null =
      null
    try {
      const { PDFParse } = await import('pdf-parse')
      parser = new PDFParse({ data: new Uint8Array(buffer) })
      const data = await parser.getText()
      const text = data.text?.trim()
      return text && text.length >= MIN_EXTRACTED_TEXT_CHARS ?
          text.slice(0, MAX_CHARS)
        : null
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
