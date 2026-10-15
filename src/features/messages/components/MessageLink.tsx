import Link from 'next/link'

export function MessageLink({ username }: { username: string }) {
  return (
    <Link
      href={`/messages/${username}`}
      className="rounded-md bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-300"
    >
      Message
    </Link>
  )
}
