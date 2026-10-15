import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { updateGroup } from '@/features/groups/actions'
import { DeleteGroupForm } from '@/features/groups/components/DeleteGroupForm'
import { GroupForm } from '@/features/groups/components/GroupForm'
import { canManage } from '@/features/groups/permissions'
import { getGroupBySlug } from '@/features/groups/queries'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Group settings' }

export default async function GroupSettingsPage({
  params,
}: PageProps<'/g/[slug]/settings'>) {
  const viewer = await requireUser()
  const { slug } = await params
  const group = await getGroupBySlug(viewer.id, slug)
  // Non-admins get the same 404 as an unknown slug, so the URL reveals nothing.
  if (!group || !canManage(group.viewerRole)) notFound()

  return (
    <Card className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="mb-4 text-xl font-semibold">Group settings</h1>
        <GroupForm
          action={updateGroup.bind(null, group.id)}
          group={group}
          submitLabel="Save"
        />
      </div>
      <DeleteGroupForm groupId={group.id} />
    </Card>
  )
}
