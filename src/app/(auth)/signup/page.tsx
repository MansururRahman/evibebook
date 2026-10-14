import type { Metadata } from 'next'
import Link from 'next/link'
import { SignupForm } from '@/features/auth/components/SignupForm'

export const metadata: Metadata = { title: 'Sign up' }

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Create your account</h1>
      <SignupForm />
      <p className="mt-4 text-sm text-zinc-600">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </>
  )
}
