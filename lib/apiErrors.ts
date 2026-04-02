/** Haalt een leesbare fouttekst uit een fetch Response (JSON of platte tekst). */
export async function getErrorMessageFromResponse(
  res: Response,
  fallback: string
): Promise<string> {
  const contentType = res.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const data = (await res.json()) as { error?: string; message?: string }
      if (typeof data.error === 'string' && data.error.trim()) return data.error
      if (typeof data.message === 'string' && data.message.trim()) return data.message
    } catch {
      // Fallback handled below
    }
  }

  try {
    const text = await res.text()
    if (text.trim()) {
      if (text.trimStart().startsWith('<')) return `${fallback} (HTTP ${res.status})`
      return text.trim().slice(0, 200)
    }
  } catch {
    // Ignore and fallback
  }

  return `${fallback} (HTTP ${res.status})`
}
