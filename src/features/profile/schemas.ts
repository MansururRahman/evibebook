import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80, 'Name is too long'),
  bio: z
    .string()
    .trim()
    .max(500, 'Bio must be 500 characters or fewer')
    .transform((v) => (v.length === 0 ? null : v)),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
