import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_UPLOAD_BYTES,
  extensionForMime,
  prepareUpload,
  resolveUploadPath,
  uploadRoot,
  uploadUrl,
  validateImage,
  writeUpload,
} from './storage'

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

describe('extensionForMime', () => {
  it('maps the allowed image types to file extensions', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg')
    expect(extensionForMime('image/png')).toBe('png')
    expect(extensionForMime('image/webp')).toBe('webp')
    expect(extensionForMime('image/gif')).toBe('gif')
  })

  it('returns null for anything else', () => {
    expect(extensionForMime('image/svg+xml')).toBeNull()
    expect(extensionForMime('text/html')).toBeNull()
  })
})

describe('validateImage', () => {
  it('accepts an allowed type under the size limit', () => {
    expect(validateImage({ type: 'image/png', size: 1024 })).toBeNull()
  })

  it('rejects disallowed types with a message', () => {
    expect(validateImage({ type: 'application/pdf', size: 10 })).toMatch(
      /JPEG, PNG, WebP or GIF/,
    )
  })

  it('rejects files over the limit', () => {
    expect(
      validateImage({ type: 'image/png', size: MAX_UPLOAD_BYTES + 1 }),
    ).toMatch(/5 MB/)
  })
})

describe('uploadUrl', () => {
  it('builds a forward-slash URL regardless of platform', () => {
    expect(uploadUrl('avatars', 'abc.png')).toBe('/uploads/avatars/abc.png')
  })
})

describe('resolveUploadPath', () => {
  const root = path.resolve('uploads')

  it('resolves a path inside the upload directory', () => {
    expect(resolveUploadPath(root, ['posts', 'abc.jpg'])).toBe(
      path.join(root, 'posts', 'abc.jpg'),
    )
  })

  it('refuses path traversal', () => {
    expect(resolveUploadPath(root, ['..', '.env'])).toBeNull()
    expect(
      resolveUploadPath(root, ['posts', '..', '..', 'package.json']),
    ).toBeNull()
  })

  it('refuses absolute segments and empty paths', () => {
    expect(resolveUploadPath(root, ['/etc/passwd'])).toBeNull()
    expect(resolveUploadPath(root, [path.resolve('package.json')])).toBeNull()
    expect(resolveUploadPath(root, [])).toBeNull()
  })
})

describe('prepareUpload', () => {
  it('accepts a real PNG and derives the URL and path from the sniffed type', async () => {
    const file = new File([PNG_1x1], 'photo.png', { type: 'image/png' })
    const result = await prepareUpload(file, 'posts')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.upload.url).toMatch(/^\/uploads\/posts\/[0-9a-f-]{36}\.png$/)
    expect(result.upload.filePath).toBe(
      path.join(uploadRoot(), 'posts', path.basename(result.upload.url)),
    )
  })

  it('rejects a file whose bytes are not an image even if its declared type is', async () => {
    const file = new File(['<svg></svg>'], 'fake.png', { type: 'image/png' })
    const result = await prepareUpload(file, 'posts')
    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/not a valid/i),
    })
  })

  it('rejects a file whose bytes are a different image format than declared', async () => {
    const file = new File([PNG_1x1], 'photo.jpg', { type: 'image/jpeg' })
    const result = await prepareUpload(file, 'avatars')
    expect(result.ok).toBe(false)
  })

  it('still applies the type and size rules', async () => {
    const pdf = new File([PNG_1x1], 'x.pdf', { type: 'application/pdf' })
    expect((await prepareUpload(pdf, 'posts')).ok).toBe(false)
  })
})

describe('writeUpload', () => {
  let dir: string
  const previous = process.env.UPLOAD_DIR
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'evibebook-uploads-'))
    process.env.UPLOAD_DIR = dir
  })
  afterEach(async () => {
    process.env.UPLOAD_DIR = previous
    await fs.rm(dir, { recursive: true, force: true })
  })

  it('writes the prepared bytes to the path it promised', async () => {
    const file = new File([PNG_1x1], 'photo.png', { type: 'image/png' })
    const result = await prepareUpload(file, 'avatars')
    if (!result.ok) throw new Error(result.error)
    await writeUpload(result.upload)
    expect(result.upload.filePath.startsWith(dir)).toBe(true)
    expect(await fs.readFile(result.upload.filePath)).toEqual(PNG_1x1)
  })
})
