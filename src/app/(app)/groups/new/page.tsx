import type { Metadata } from 'next'
import { Card } from '@/components/ui/Card'
import { createGroup } from '@/features/groups/actions'
import { GroupForm } from '@/features/groups/components/GroupForm'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Create group' }

export default async function NewGroupPage() {
  await requireUser()
  return (
    <Card className="mx-auto max-w-lg">
      <h1 className="mb-4 text-xl font-semibold">Create group</h1>
      <GroupForm action={createGroup} submitLabel="Create group" />
    </Card>
  )
}
