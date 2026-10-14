import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/features/auth/components/LoginForm'

export const metadata: Metadata = { title: 'Log in' }

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Log in</h1>
      <LoginForm next={typeof next === 'string' ? next : undefined} />
      <p className="mt-4 text-sm text-zinc-600">
        New here?{' '}
        <Link href="/signup" className="text-blue-600 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  )
}
