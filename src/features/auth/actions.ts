'use server'

import { AuthError } from 'next-auth'
import { z } from 'zod'
import { signIn, signOut } from '@/auth'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { fail, type ActionResult } from '@/lib/action-result'
import { logInSchema, signUpSchema } from './schemas'

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : ''
  return next.startsWith('/') && !next.startsWith('//') ? next : '/feed'
}

export async function signUp(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return fail(
      'Please fix the highlighted fields',
      z.flattenError(parsed.error).fieldErrors,
    )
  }
  const { email, username, name, password } = parsed.data

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  })
  if (existing) {
    return fail('Please fix the highlighted fields', {
      email:
        existing.email === email
          ? ['An account with this email already exists']
          : undefined,
      username:
        existing.username === username
          ? ['This username is already taken']
          : undefined,
    })
  }

  try {
    await prisma.user.create({
      data: {
        email,
        username,
        name,
        passwordHash: await hashPassword(password),
      },
    })
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') {
      return fail('That email or username was just taken. Try another.')
    }
    throw e
  }

  await signIn('credentials', { email, password, redirectTo: '/feed' })
  return { ok: true }
}

export async function logIn(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = logInSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return fail(
      'Please fix the highlighted fields',
      z.flattenError(parsed.error).fieldErrors,
    )
  }
  try {
    await signIn('credentials', {
      ...parsed.data,
      redirectTo: safeNext(formData.get('next')),
    })
  } catch (e) {
    if (e instanceof AuthError) return fail('Invalid email or password')
    throw e // NEXT_REDIRECT and anything unexpected must propagate
  }
  return { ok: true }
}

export async function logOut(): Promise<void> {
  await signOut({ redirectTo: '/login' })
}
