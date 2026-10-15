import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PostCard } from '@/features/posts/components/PostCard'
import { getPost } from '@/features/posts/queries'
import { requireUser } from '@/lib/session'

export async function generateMetadata({
  params,
}: PageProps<'/p/[id]'>): Promise<Metadata> {
  const viewer = await requireUser()
  const { id } = await params
  const post = await getPost(viewer.id, id)
  // Page posts are from the page; the acting admin is never shown, not even here.
  const by = post ? (post.page ? post.page.name : post.author.name) : null
  return { title: by ? `Post by ${by}` : 'Post' }
}

export default async function PostPage({ params }: PageProps<'/p/[id]'>) {
  const viewer = await requireUser()
  const { id } = await params
  // Unknown and not-visible posts both 404 so the URL reveals nothing.
  const post = await getPost(viewer.id, id)
  if (!post) notFound()

  return <PostCard post={post} viewerId={viewer.id} afterDelete="/feed" />
}
