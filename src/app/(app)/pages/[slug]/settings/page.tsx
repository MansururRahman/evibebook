import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { updatePage } from '@/features/pages/actions'
import { DeletePageForm } from '@/features/pages/components/DeletePageForm'
import { PageForm } from '@/features/pages/components/PageForm'
import { canManagePage } from '@/features/pages/permissions'
import { getPageBySlug } from '@/features/pages/queries'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Page settings' }

export default async function PageSettings({
  params,
}: PageProps<'/pages/[slug]/settings'>) {
  const viewer = await requireUser()
  const { slug } = await params
  const page = await getPageBySlug(viewer.id, slug)
  if (!page || !canManagePage(page.viewerRole)) notFound()

  return (
    <Card className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="mb-4 text-xl font-semibold">Page settings</h1>
        <PageForm
          action={updatePage.bind(null, page.id)}
          page={page}
          submitLabel="Save"
        />
      </div>
      <DeletePageForm pageId={page.id} />
    </Card>
  )
}
