import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'

export default async function AuthLayout({ children }: LayoutProps<'/'>) {
  if (await getCurrentUser()) redirect('/feed')
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-6 text-3xl font-bold text-blue-600">
        evibebook
      </Link>
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  )
}
