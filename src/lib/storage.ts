import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { EXT_BY_MIME, sniffImageType, validateImage } from '@/lib/image-rules'

export {
  MAX_UPLOAD_BYTES,
  extensionForMime,
  validateImage,
} from '@/lib/image-rules'

export type UploadKind = 'avatars' | 'posts'

const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_BY_MIME).map(([mime, ext]) => [ext, mime]),
)

export function uploadRoot(): string {
  return path.resolve(process.env.UPLOAD_DIR || './uploads')
}

export function mimeForExtension(ext: string): string | null {
  return MIME_BY_EXT[ext.toLowerCase()] ?? null
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

export type PreparedUpload = {
  /** Public URL the row should store. */
  url: string
  /** Absolute path writeUpload will create. */
  filePath: string
  bytes: Buffer
}

export type PrepareUploadResult =
  { ok: true; upload: PreparedUpload } | { ok: false; error: string }

/**
 * Validate an uploaded image (declared type, size, and the actual leading
 * bytes) and decide where it will live, without touching the disk yet. Callers
 * create the database row first and then call writeUpload inside the same
 * transaction, so a failed insert never leaves an orphan file.
 */
export async function prepareUpload(
  file: File,
  kind: UploadKind,
): Promise<PrepareUploadResult> {
  const problem = validateImage(file)
  if (problem) return { ok: false, error: problem }

  const bytes = Buffer.from(await file.arrayBuffer())
  const sniffed = sniffImageType(bytes)
  if (!sniffed || sniffed !== file.type)
    return { ok: false, error: 'That file is not a valid image' }

  const filename = `${randomUUID()}.${EXT_BY_MIME[sniffed]}`
  return {
    ok: true,
    upload: {
      url: uploadUrl(kind, filename),
      filePath: path.join(uploadRoot(), kind, filename),
      bytes,
    },
  }
}

/** Write a prepared upload to disk. */
export async function writeUpload(upload: PreparedUpload): Promise<void> {
  await fs.mkdir(path.dirname(upload.filePath), { recursive: true })
  await fs.writeFile(upload.filePath, upload.bytes)
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
