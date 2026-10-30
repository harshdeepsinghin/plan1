import { z } from 'zod'

/** Profile edits are user input that ends up in every page header. */
export const profileUpdateSchema = z.object({
  full_name: z.string().trim().max(100).optional().default(''),
  avatar_url: z
    .string()
    .trim()
    .max(500)
    .url('Enter a valid image URL')
    .refine((value) => /^https:\/\//i.test(value), 'Avatar URLs must use https')
    .optional()
    .or(z.literal('')),
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
