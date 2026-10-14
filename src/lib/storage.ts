import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export type UploadKind = 'avatars' | 'posts'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_BY_MIME).map(([mime, ext]) => [ext, mime]),
)

export function uploadRoot(): string {
  return path.resolve(process.env.UPLOAD_DIR || './uploads')
}

export function extensionForMime(mime: string): string | null {
  return EXT_BY_MIME[mime] ?? null
}

export function mimeForExtension(ext: string): string | null {
  return MIME_BY_EXT[ext.toLowerCase()] ?? null
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

/** Public URL for a stored upload. Always forward slashes, never path.join. */
export function uploadUrl(kind: UploadKind, filename: string): string {
  return ['', 'uploads', kind, filename].join('/')
}

/** Resolve URL path segments to a file inside `root`, or null if they escape it. */
export function resolveUploadPath(
  root: string,
  segments: string[],
): string | null {
  if (segments.length === 0) return null
  if (
    segments.some(
      (s) => s.length === 0 || s === '.' || s === '..' || path.isAbsolute(s),
    )
  ) {
    return null
  }
  if (segments.some((s) => s.includes('/') || s.includes('\\'))) return null
  const resolved = path.resolve(root, ...segments)
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep
  return resolved.startsWith(rootWithSep) ? resolved : null
}

/** Write an already-validated image to disk and return its public URL. */
export async function saveUpload(
  file: File,
  kind: UploadKind,
): Promise<string> {
  const ext = extensionForMime(file.type)
  if (!ext) throw new Error(`Unsupported image type: ${file.type}`)
  const filename = `${randomUUID()}.${ext}`
  const dir = path.join(uploadRoot(), kind)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(
    path.join(dir, filename),
    Buffer.from(await file.arrayBuffer()),
  )
  return uploadUrl(kind, filename)
}

/** Best-effort delete of a file previously returned by saveUpload. */
export async function deleteUpload(
  url: string | null | undefined,
): Promise<void> {
  if (!url || !url.startsWith('/uploads/')) return
  const target = resolveUploadPath(
    uploadRoot(),
    url.slice('/uploads/'.length).split('/'),
  )
  if (!target) return
  await fs.unlink(target).catch(() => undefined)
}
