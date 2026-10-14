import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MAX_UPLOAD_BYTES,
  extensionForMime,
  resolveUploadPath,
  uploadUrl,
  validateImage,
} from './storage'

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
