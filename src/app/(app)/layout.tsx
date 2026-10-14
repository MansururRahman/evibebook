import { Navbar } from '@/components/Navbar'
import { requireUser } from '@/lib/session'
import { countIncoming } from '@/features/friends/queries'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser()
  const pendingRequests = await countIncoming(user.id)
  return (
    <>
      <Navbar user={user} pendingRequests={pendingRequests} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  )
}
