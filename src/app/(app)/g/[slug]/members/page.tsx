import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JoinRequestList } from '@/features/groups/components/JoinRequestList'
import { MemberList } from '@/features/groups/components/MemberList'
import { canManage } from '@/features/groups/permissions'
import {
  getGroupBySlug,
  getJoinRequests,
  getMembers,
} from '@/features/groups/queries'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Members' }

export default async function GroupMembersPage({
  params,
}: PageProps<'/g/[slug]/members'>) {
  const viewer = await requireUser()
  const { slug } = await params
  const group = await getGroupBySlug(viewer.id, slug)
  if (!group) notFound()

  const showRequests =
    group.privacy === 'PRIVATE' && canManage(group.viewerRole)
  const [members, requests] = await Promise.all([
    getMembers(group.id),
    showRequests ? getJoinRequests(group.id) : Promise.resolve([]),
  ])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        <Link href={`/g/${group.slug}`} className="hover:underline">
          {group.name}
        </Link>{' '}
        <span className="font-normal text-zinc-500">· Members</span>
      </h1>
      {showRequests ? (
        <JoinRequestList groupId={group.id} requests={requests} />
      ) : null}
      <MemberList
        groupId={group.id}
        members={members}
        viewer={{ id: viewer.id, role: group.viewerRole }}
      />
    </div>
  )
}
