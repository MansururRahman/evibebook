import { z } from 'zod'

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/

// RFC 5321 caps a mailbox address at 254 characters.
export const EMAIL_MAX = 254
// bcrypt only hashes the first 72 bytes; anything longer would silently match.
export const PASSWORD_MAX_BYTES = 72

const email = z
  .email('Enter a valid email address')
  .max(EMAIL_MAX, 'Email is too long')
  .transform((v) => v.toLowerCase())

const passwordByteLimit = z
  .string()
  .refine((v) => new TextEncoder().encode(v).length <= PASSWORD_MAX_BYTES, {
    message: `Passwords must be ${PASSWORD_MAX_BYTES} bytes or fewer`,
  })

export const signUpSchema = z.object({
  email,
  username: z
    .string()
    .transform((v) => v.trim().toLowerCase())
    .pipe(
      z
        .string()
        .regex(
          USERNAME_RE,
          'Use 3-20 characters: lowercase letters, numbers, underscores',
        ),
    ),
  name: z.string().trim().min(1, 'Enter your name').max(80, 'Name is too long'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .pipe(passwordByteLimit),
})

export const logInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password').pipe(passwordByteLimit),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type LogInInput = z.infer<typeof logInSchema>
