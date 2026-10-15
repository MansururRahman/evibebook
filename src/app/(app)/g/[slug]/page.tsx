import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GroupHeader } from '@/features/groups/components/GroupHeader'
import { getGroupBySlug } from '@/features/groups/queries'
import { PostComposer } from '@/features/posts/components/PostComposer'
import { PostList } from '@/features/posts/components/PostList'
import { getGroupPosts } from '@/features/posts/queries'
import { requireUser } from '@/lib/session'

export async function generateMetadata({
  params,
}: PageProps<'/g/[slug]'>): Promise<Metadata> {
  const viewer = await requireUser()
  const { slug } = await params
  const group = await getGroupBySlug(viewer.id, slug)
  return { title: group ? group.name : 'Group' }
}

export default async function GroupPage({
  params,
  searchParams,
}: PageProps<'/g/[slug]'>) {
  const viewer = await requireUser()
  const { slug } = await params
  const { cursor } = await searchParams
  const group = await getGroupBySlug(viewer.id, slug)
  if (!group) notFound()

  const canSeePosts = group.privacy === 'PUBLIC' || group.viewerRole !== null
  const page = canSeePosts
    ? await getGroupPosts(
        viewer.id,
        group.id,
        typeof cursor === 'string' ? cursor : undefined,
      )
    : null

  return (
    <div className="flex flex-col gap-4">
      <GroupHeader group={group} />
      {group.viewerRole && !cursor ? (
        <PostComposer
          viewer={{ name: viewer.name, avatarUrl: viewer.avatarUrl }}
          groupId={group.id}
        />
      ) : null}
      {page ? (
        <PostList
          posts={page.posts}
          viewerId={viewer.id}
          nextCursor={page.nextCursor}
          basePath={`/g/${group.slug}`}
          emptyMessage="No posts in this group yet."
        />
      ) : (
        <p className="py-8 text-center text-sm text-zinc-500">
          This group is private. Request to join to see its posts.
        </p>
      )}
    </div>
  )
}
