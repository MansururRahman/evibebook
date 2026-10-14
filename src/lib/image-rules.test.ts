import { describe, expect, it } from 'vitest'
import { sniffImageType } from './image-rules'

const png = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0,
])
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46])
const gif87 = Uint8Array.from([...Buffer.from('GIF87a'), 0, 0])
const gif89 = Uint8Array.from([...Buffer.from('GIF89a'), 0, 0])
const webp = Uint8Array.from([
  ...Buffer.from('RIFF'),
  0x24,
  0,
  0,
  0,
  ...Buffer.from('WEBP'),
  ...Buffer.from('VP8 '),
])

describe('sniffImageType', () => {
  it('recognizes the four allowed formats by their magic bytes', () => {
    expect(sniffImageType(png)).toBe('image/png')
    expect(sniffImageType(jpeg)).toBe('image/jpeg')
    expect(sniffImageType(gif87)).toBe('image/gif')
    expect(sniffImageType(gif89)).toBe('image/gif')
    expect(sniffImageType(webp)).toBe('image/webp')
  })

  it('returns null for text, SVG, and empty or truncated input', () => {
    expect(
      sniffImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">')),
    ).toBeNull()
    expect(sniffImageType(Buffer.from('hello world'))).toBeNull()
    expect(sniffImageType(new Uint8Array(0))).toBeNull()
    expect(sniffImageType(png.subarray(0, 4))).toBeNull()
  })

  it('does not treat a RIFF container that is not WebP as an image', () => {
    const wav = Uint8Array.from([
      ...Buffer.from('RIFF'),
      0,
      0,
      0,
      0,
      ...Buffer.from('WAVE'),
    ])
    expect(sniffImageType(wav)).toBeNull()
  })
})
