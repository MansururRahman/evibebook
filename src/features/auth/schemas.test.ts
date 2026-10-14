import { describe, expect, it } from 'vitest'
import { logInSchema, signUpSchema } from './schemas'

const valid = {
  email: 'Alice@Example.com',
  username: 'Alice_01',
  name: 'Alice',
  password: 'password123',
}

describe('signUpSchema', () => {
  it('accepts a valid sign-up and normalizes email and username to lowercase', () => {
    const result = signUpSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.email).toBe('alice@example.com')
    expect(result.data.username).toBe('alice_01')
  })

  it('rejects usernames shorter than 3 characters', () => {
    expect(signUpSchema.safeParse({ ...valid, username: 'ab' }).success).toBe(
      false,
    )
  })

  it('rejects usernames longer than 20 characters', () => {
    expect(
      signUpSchema.safeParse({ ...valid, username: 'a'.repeat(21) }).success,
    ).toBe(false)
  })

  it('rejects usernames with characters outside a-z, 0-9 and underscore', () => {
    expect(
      signUpSchema.safeParse({ ...valid, username: 'ali ce' }).success,
    ).toBe(false)
    expect(
      signUpSchema.safeParse({ ...valid, username: 'ali-ce' }).success,
    ).toBe(false)
  })

  it('rejects passwords shorter than 8 characters', () => {
    expect(
      signUpSchema.safeParse({ ...valid, password: 'short' }).success,
    ).toBe(false)
  })

  it('rejects an empty name and trims surrounding whitespace', () => {
    expect(signUpSchema.safeParse({ ...valid, name: '   ' }).success).toBe(
      false,
    )
    const result = signUpSchema.safeParse({ ...valid, name: '  Alice  ' })
    expect(result.success && result.data.name).toBe('Alice')
  })

  it('rejects an invalid email', () => {
    expect(
      signUpSchema.safeParse({ ...valid, email: 'not-an-email' }).success,
    ).toBe(false)
  })
})

describe('logInSchema', () => {
  it('lowercases the email and requires a non-empty password', () => {
    const ok = logInSchema.safeParse({
      email: 'Bob@Example.com',
      password: 'x',
    })
    expect(ok.success && ok.data.email).toBe('bob@example.com')
    expect(
      logInSchema.safeParse({ email: 'bob@example.com', password: '' }).success,
    ).toBe(false)
  })
})
