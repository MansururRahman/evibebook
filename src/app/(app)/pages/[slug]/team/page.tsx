import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TeamList } from '@/features/pages/components/TeamList'
import { canPostAsPage } from '@/features/pages/permissions'
import { getPageBySlug, getTeam } from '@/features/pages/queries'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Team' }

export default async function PageTeam({
  params,
}: PageProps<'/pages/[slug]/team'>) {
  const viewer = await requireUser()
  const { slug } = await params
  const page = await getPageBySlug(viewer.id, slug)
  // Outsiders get the same 404 as an unknown slug, so the URL reveals nothing.
  if (!page || !page.viewerRole || !canPostAsPage(page.viewerRole)) notFound()
  const team = await getTeam(page.id)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        <Link href={`/pages/${page.slug}`} className="hover:underline">
          {page.name}
        </Link>{' '}
        <span className="font-normal text-zinc-500">· Team</span>
      </h1>
      <TeamList
        pageId={page.id}
        team={team}
        viewer={{ id: viewer.id, role: page.viewerRole }}
      />
    </div>
  )
}
