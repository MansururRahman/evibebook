import { Navbar } from '@/components/Navbar'
import { requireUser } from '@/lib/session'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser()
  return (
    <>
      <Navbar user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  )
}
