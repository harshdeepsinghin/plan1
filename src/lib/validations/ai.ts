import { z } from 'zod'

/** Bounds on everything a browser can send to a Gemini action. */
export const chatHistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000),
})

export const chatInputSchema = z.object({
  eventId: z.string().uuid(),
  message: z.string().trim().min(1, 'Write a message first').max(2000),
  history: z.array(chatHistoryItemSchema).max(20).default([]),
})

export const speechInputSchema = z.object({
  eventId: z.string().uuid(),
  role: z.enum(['partner', 'parent', 'sibling', 'friend', 'colleague', 'host']),
  relationship: z.string().trim().max(200).default(''),
  tone: z.enum(['heartfelt', 'funny', 'formal', 'short', 'roast']),
  keyMemories: z.string().trim().max(2000).default(''),
})

export const aiEventIdSchema = z.string().uuid()

export type ChatInput = z.infer<typeof chatInputSchema>
export type SpeechInput = z.infer<typeof speechInputSchema>
