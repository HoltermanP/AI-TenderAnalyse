/**
 * Slaat een Blob op via de File System Access API (map naar keuze).
 * Valt terug op download als de API ontbreekt of de gebruiker annuleert.
 */
export async function saveBlobToDisk(
  blob: Blob,
  suggestedName: string,
  accept: Record<string, string[]>
): Promise<'saved' | 'cancelled' | 'downloaded'> {
  if (typeof window === 'undefined') return 'downloaded'

  const w = window as Window & {
    showSaveFilePicker?: (options: {
      suggestedName?: string
      types?: { description: string; accept: Record<string, string[]> }[]
    }) => Promise<FileSystemFileHandle>
  }

  if (typeof w.showSaveFilePicker !== 'function') {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = suggestedName
    a.click()
    URL.revokeObjectURL(url)
    return 'downloaded'
  }

  try {
    const handle = await w.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'Bestand', accept }],
    })
    const writable = await handle.createWritable()
    await writable.write(await blob.arrayBuffer())
    await writable.close()
    return 'saved'
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return 'cancelled'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = suggestedName
    a.click()
    URL.revokeObjectURL(url)
    return 'downloaded'
  }
}
