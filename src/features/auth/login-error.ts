import { AuthError } from 'next-auth'

export type LoginFailure = 'invalid' | 'unavailable'

/**
 * Auth.js reports a rejected password and an exception inside `authorize` (for
 * example the database being down) through the same AuthError base class. Only
 * `CredentialsSignin` means the credentials were actually wrong; everything
 * else is an outage the user should retry. Non-auth errors (NEXT_REDIRECT,
 * programming bugs) return null so the caller rethrows them.
 */
export function classifyLoginError(e: unknown): LoginFailure | null {
  if (!(e instanceof AuthError)) return null
  return e.type === 'CredentialsSignin' ? 'invalid' : 'unavailable'
}

export const LOGIN_FAILURE_MESSAGE: Record<LoginFailure, string> = {
  invalid: 'Invalid email or password',
  unavailable: 'Could not log you in right now. Please try again.',
}
