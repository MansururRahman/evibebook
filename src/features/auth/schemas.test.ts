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

describe('length caps', () => {
  const longEmail = `${'a'.repeat(250)}@example.com` // 262 chars

  it('rejects emails longer than 254 characters on sign-up and login', () => {
    expect(signUpSchema.safeParse({ ...valid, email: longEmail }).success).toBe(
      false,
    )
    expect(
      logInSchema.safeParse({ email: longEmail, password: 'x' }).success,
    ).toBe(false)
  })

  it('rejects passwords over 72 UTF-8 bytes even when under 72 characters', () => {
    const multibyte = 'é'.repeat(37) // 37 chars, 74 bytes: bcrypt would silently truncate it
    expect(
      signUpSchema.safeParse({ ...valid, password: multibyte }).success,
    ).toBe(false)
    expect(
      logInSchema.safeParse({ email: valid.email, password: multibyte })
        .success,
    ).toBe(false)
  })

  it('accepts a password of exactly 72 bytes', () => {
    expect(
      signUpSchema.safeParse({ ...valid, password: 'a'.repeat(72) }).success,
    ).toBe(true)
  })
})
