import { z } from 'zod'

export const GROUP_NAME_MAX = 80
export const GROUP_DESCRIPTION_MAX = 500
export const GROUP_PRIVACIES = ['PUBLIC', 'PRIVATE'] as const

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a group name')
    .max(GROUP_NAME_MAX, `Names must be ${GROUP_NAME_MAX} characters or fewer`),
  description: z
    .string()
    .trim()
    .max(
      GROUP_DESCRIPTION_MAX,
      `Descriptions must be ${GROUP_DESCRIPTION_MAX} characters or fewer`,
    )
    .transform((v) => (v.length === 0 ? null : v)),
  privacy: z.enum(GROUP_PRIVACIES, { message: 'Choose public or private' }),
})

export type GroupInput = z.infer<typeof groupSchema>
