import { promises as fs } from 'node:fs'
import path from 'node:path'
import { mimeForExtension, resolveUploadPath, uploadRoot } from '@/lib/storage'

export async function GET(
  _req: Request,
  ctx: RouteContext<'/uploads/[...path]'>,
) {
  const { path: segments } = await ctx.params
  const target = resolveUploadPath(uploadRoot(), segments)
  if (!target) return new Response('Not found', { status: 404 })

  const mime = mimeForExtension(path.extname(target).slice(1))
  if (!mime) return new Response('Not found', { status: 404 })

  try {
    const data = await fs.readFile(target)
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(data.byteLength),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
