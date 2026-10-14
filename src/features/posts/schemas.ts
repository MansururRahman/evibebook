import { z } from 'zod'

export const POST_BODY_MAX = 2000
export const COMMENT_BODY_MAX = 1000

export const postBodySchema = z
  .string()
  .trim()
  .max(POST_BODY_MAX, `Posts must be ${POST_BODY_MAX} characters or fewer`)

export const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Write a comment')
    .max(
      COMMENT_BODY_MAX,
      `Comments must be ${COMMENT_BODY_MAX} characters or fewer`,
    ),
})
