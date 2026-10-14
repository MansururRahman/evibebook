import type { Metadata } from 'next'
import { Card } from '@/components/ui/Card'
import { ProfileForm } from '@/features/profile/components/ProfileForm'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Edit profile' }

export default async function ProfileSettingsPage() {
  const user = await requireUser()
  return (
    <Card className="mx-auto max-w-lg">
      <h1 className="mb-4 text-xl font-semibold">Edit profile</h1>
      <ProfileForm user={user} />
    </Card>
  )
}
