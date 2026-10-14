import { AuthError, CredentialsSignin } from 'next-auth'
import { describe, expect, it } from 'vitest'
import { classifyLoginError } from './login-error'

describe('classifyLoginError', () => {
  it('treats a credentials rejection as invalid credentials', () => {
    expect(classifyLoginError(new CredentialsSignin())).toBe('invalid')
  })

  it('treats any other Auth.js error (e.g. the database being down) as an outage', () => {
    class CallbackRouteError extends AuthError {
      static type = 'CallbackRouteError'
    }
    expect(classifyLoginError(new CallbackRouteError('db down'))).toBe(
      'unavailable',
    )
  })

  it('leaves non-auth errors alone so redirects and bugs propagate', () => {
    expect(classifyLoginError(new Error('NEXT_REDIRECT'))).toBeNull()
    expect(classifyLoginError('string')).toBeNull()
  })
})
