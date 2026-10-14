import Link from 'next/link'
import { logOut } from '@/features/auth/actions'
import { Button } from '@/components/ui/Button'
import type { CurrentUser } from '@/lib/session'

export function Navbar({ user }: { user: CurrentUser }) {
  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-2">
        <Link href="/feed" className="text-xl font-bold text-blue-600">
          evibebook
        </Link>
        <Link href="/feed" className="text-sm text-zinc-700 hover:underline">
          Feed
        </Link>
        <span className="flex-1" />
        <Link
          href={`/u/${user.username}`}
          className="text-sm font-medium text-zinc-900 hover:underline"
        >
          {user.name}
        </Link>
        <form action={logOut}>
          <Button type="submit" variant="ghost">
            Log out
          </Button>
        </form>
      </div>
    </nav>
  )
}
