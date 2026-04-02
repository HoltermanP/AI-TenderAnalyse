import { randomUUID } from 'crypto'
import { put, del, list } from '@vercel/blob'

/** Vereist voor uploads (Vercel zet dit automatisch bij Blob-store; lokaal: token in .env.local). */
export function assertBlobWriteToken(): void {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN ontbreekt. Voeg in Vercel Storage → Blob aan je project toe, of kopieer de token naar .env.local voor lokale ontwikkeling.'
    )
  }
}

export interface UploadedFile {
  url: string
  pathname: string
  contentType: string
  size: number
}

export async function uploadFile(
  file: File,
  folder: string = 'uploads'
): Promise<UploadedFile> {
  assertBlobWriteToken()
  const filename = `${folder}/${Date.now()}-${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

  const blob = await put(filename, file, {
    access: 'public',
    contentType: file.type,
  })

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType ?? file.type,
    size: file.size,
  }
}

export async function uploadBuffer(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder: string = 'exports'
): Promise<UploadedFile> {
  assertBlobWriteToken()
  const pathname = `${folder}/${Date.now()}-${randomUUID()}-${filename}`

  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType,
  })

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType,
    size: buffer.length,
  }
}

export async function deleteFile(url: string): Promise<void> {
  await del(url)
}

/** Verwijdert meerdere blobs (dedupe); één mislukte URL blokkeert de rest niet. */
export async function deleteBlobUrls(urls: string[]): Promise<void> {
  const unique = Array.from(new Set(urls.filter(Boolean)))
  if (!unique.length) return
  await Promise.allSettled(unique.map((url) => del(url)))
}

export async function listFiles(prefix: string): Promise<string[]> {
  const { blobs } = await list({ prefix })
  return blobs.map((b) => b.url)
}

export const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
  'text/plain',
]

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Bestandstype niet toegestaan. Gebruik PDF, Word of Excel.`
  }
  if (file.size > MAX_FILE_SIZE) {
    return `Bestand is te groot. Maximum is 10 MB.`
  }
  return null
}
