import { z } from 'zod'

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/

export const signUpSchema = z.object({
  email: z
    .email('Enter a valid email address')
    .transform((v) => v.toLowerCase()),
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
    .max(200, 'Password is too long'),
})

export const logInSchema = z.object({
  email: z
    .email('Enter a valid email address')
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Enter your password'),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type LogInInput = z.infer<typeof logInSchema>
