import type { Metadata } from 'next'
import { Card } from '@/components/ui/Card'
import { createPage } from '@/features/pages/actions'
import { PageForm } from '@/features/pages/components/PageForm'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Create page' }

export default async function NewPagePage() {
  await requireUser()
  return (
    <Card className="mx-auto max-w-lg">
      <h1 className="mb-4 text-xl font-semibold">Create page</h1>
      <PageForm action={createPage} submitLabel="Create page" />
    </Card>
  )
}
