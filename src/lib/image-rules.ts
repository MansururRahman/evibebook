// Pure image rules shared by the server (storage.ts) and client forms. No Node imports here.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const ACCEPTED_IMAGE_TYPES = Object.keys(EXT_BY_MIME).join(',')

export function extensionForMime(mime: string): string | null {
  return EXT_BY_MIME[mime] ?? null
}

/** Returns an error message, or null when the file is an acceptable image. */
export function validateImage(file: {
  type: string
  size: number
}): string | null {
  if (!extensionForMime(file.type)) return 'Use a JPEG, PNG, WebP or GIF image'
  if (file.size > MAX_UPLOAD_BYTES) return 'Images must be 5 MB or smaller'
  return null
}
