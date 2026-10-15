import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/features/pages/components/PageHeader'
import { canPostAsPage } from '@/features/pages/permissions'
import { getPageBySlug } from '@/features/pages/queries'
import { PostComposer } from '@/features/posts/components/PostComposer'
import { PostList } from '@/features/posts/components/PostList'
import { getPagePosts } from '@/features/posts/queries'
import { requireUser } from '@/lib/session'

export async function generateMetadata({
  params,
}: PageProps<'/pages/[slug]'>): Promise<Metadata> {
  const viewer = await requireUser()
  const { slug } = await params
  const page = await getPageBySlug(viewer.id, slug)
  return { title: page ? page.name : 'Page' }
}

export default async function PageView({
  params,
  searchParams,
}: PageProps<'/pages/[slug]'>) {
  const viewer = await requireUser()
  const { slug } = await params
  const { cursor } = await searchParams
  const page = await getPageBySlug(viewer.id, slug)
  if (!page) notFound()

  const posts = await getPagePosts(
    viewer.id,
    page.id,
    typeof cursor === 'string' ? cursor : undefined,
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader page={page} />
      {canPostAsPage(page.viewerRole) && !cursor ? (
        <PostComposer pageId={page.id} />
      ) : null}
      <PostList
        posts={posts.posts}
        viewerId={viewer.id}
        nextCursor={posts.nextCursor}
        basePath={`/pages/${page.slug}`}
        emptyMessage="This page has not posted yet."
      />
    </div>
  )
}
