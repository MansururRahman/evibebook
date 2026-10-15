import { z } from 'zod'

export const PAGE_NAME_MAX = 80
export const PAGE_DESCRIPTION_MAX = 500

export const pageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a page name')
    .max(PAGE_NAME_MAX, `Names must be ${PAGE_NAME_MAX} characters or fewer`),
  description: z
    .string()
    .trim()
    .max(
      PAGE_DESCRIPTION_MAX,
      `Descriptions must be ${PAGE_DESCRIPTION_MAX} characters or fewer`,
    )
    .transform((v) => (v.length === 0 ? null : v)),
})

export type PageInput = z.infer<typeof pageSchema>
