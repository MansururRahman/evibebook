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

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG = [0xff, 0xd8, 0xff]
const GIF = [0x47, 0x49, 0x46, 0x38] // "GIF8", followed by "7a" or "9a"
const RIFF = [0x52, 0x49, 0x46, 0x46]
const WEBP = [0x57, 0x45, 0x42, 0x50]

function startsWith(bytes: Uint8Array, magic: number[], offset = 0): boolean {
  if (bytes.length < offset + magic.length) return false
  return magic.every((b, i) => bytes[offset + i] === b)
}

/**
 * The MIME type the file's leading bytes say it is, or null when it is not one
 * of the allowed image formats. Used to reject files whose declared type lies.
 */
export function sniffImageType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, PNG)) return 'image/png'
  if (startsWith(bytes, JPEG)) return 'image/jpeg'
  if (
    startsWith(bytes, GIF) &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  )
    return 'image/gif'
  if (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) return 'image/webp'
  return null
}
