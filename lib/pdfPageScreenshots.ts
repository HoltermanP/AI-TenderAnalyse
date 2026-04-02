/**
 * Geen statische import van pdf-parse/pdfjs-dist: webpack + pdfjs-dist geeft dan
 * "Object.defineProperty called on non-object" in Next.js route bundles.
 */

export type PdfScreenshotParams = {
  first?: number
  imageBuffer?: boolean
  imageDataUrl?: boolean
  scale?: number
  desiredWidth?: number
}

/** Minimale interface zodat dezelfde parser kan worden hergebruikt na getText(). */
export type PdfParserForScreenshots = {
  getScreenshot: (params?: PdfScreenshotParams) => Promise<{ pages: Array<{ data: Uint8Array }> }>
}

function screenshotParams(
  maxPages: number,
  opts?: { scale?: number; desiredWidth?: number }
): PdfScreenshotParams {
  const first = Math.max(1, Math.min(maxPages, 50))
  return {
    first,
    imageBuffer: true,
    imageDataUrl: false,
    scale: opts?.desiredWidth ? undefined : (opts?.scale ?? 1.5),
    desiredWidth: opts?.desiredWidth,
  }
}

/** Rendert de eerste N pagina’s als PNG-bytes (één nieuwe PDFParse-load). */
export async function renderPdfFirstPagesPng(
  buffer: Buffer,
  maxPages: number,
  opts?: { scale?: number; desiredWidth?: number }
): Promise<Uint8Array[]> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    return await renderPdfPagesWithParser(parser, maxPages, opts)
  } finally {
    await parser.destroy().catch(() => {})
  }
}

/** Zelfde als renderPdfFirstPagesPng maar hergebruikt een al geladen parser (na getText). */
export async function renderPdfPagesWithParser(
  parser: PdfParserForScreenshots,
  maxPages: number,
  opts?: { scale?: number; desiredWidth?: number }
): Promise<Uint8Array[]> {
  const shot = await parser.getScreenshot(screenshotParams(maxPages, opts))
  return shot.pages.map((p) => p.data)
}
