import type { Metadata } from 'next'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Feed' }

export default async function FeedPage() {
  const user = await requireUser()
  return <h1 className="text-xl font-semibold">Hello, {user.name}</h1>
}
