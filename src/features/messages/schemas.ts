import { z } from 'zod'

export const MESSAGE_BODY_MAX = 2000

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, 'Write a message')
  .max(
    MESSAGE_BODY_MAX,
    `Messages must be ${MESSAGE_BODY_MAX} characters or fewer`,
  )
