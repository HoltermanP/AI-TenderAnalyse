import { PDFParse } from 'pdf-parse'

const MAX_CHARS = 500_000

/**
 * Haalt platte tekst uit ondersteunde tenderbijlagen (PDF, plain text, Word, Excel).
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mime: string,
  fileName: string
): Promise<string | null> {
  const lower = fileName.toLowerCase()
  const m = mime.toLowerCase()

  if (m === 'text/plain' || m.startsWith('text/')) {
    try {
      return buffer.toString('utf-8').slice(0, MAX_CHARS)
    } catch {
      return null
    }
  }

  if (m === 'application/pdf' || lower.endsWith('.pdf')) {
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    try {
      const data = await parser.getText()
      const text = data.text?.trim()
      return text ? text.slice(0, MAX_CHARS) : null
    } catch {
      return null
    } finally {
      try {
        await parser.destroy()
      } catch {
        /* ignore */
      }
    }
  }

  if (
    m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx')
  ) {
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      const text = result.value?.trim()
      return text ? text.slice(0, MAX_CHARS) : null
    } catch {
      return null
    }
  }

  if (
    m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    lower.endsWith('.xlsx')
  ) {
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const parts: string[] = []
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName]
        if (sheet) parts.push(XLSX.utils.sheet_to_csv(sheet))
      }
      const joined = parts.join('\n\n').trim()
      return joined ? joined.slice(0, MAX_CHARS) : null
    } catch {
      return null
    }
  }

  return null
}
