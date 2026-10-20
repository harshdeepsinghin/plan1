import { z } from 'zod'

export const eventTypeSchema = z.enum(['wedding', 'birthday', 'community', 'other'])
export const eventStatusSchema = z.enum(['planning', 'active', 'completed', 'cancelled'])

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  event_type: eventTypeSchema,
  event_date: z.string().min(1, 'Event date is required'),
  venue: z.string().max(200).optional().nullable(),
  guest_count: z.coerce.number().int().min(0).default(0),
  budget_total: z.coerce.number().min(0).default(0),
})

export const updateEventSchema = createEventSchema.partial().extend({
  status: eventStatusSchema.optional(),
  ai_generated_theme: z.any().optional(),
})

export const budgetCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  allocated: z.coerce.number().min(0).default(0),
  sort_order: z.coerce.number().int().default(0),
})

export const budgetItemSchema = z.object({
  category_id: z.string().uuid('Invalid category'),
  name: z.string().min(1, 'Item name is required').max(100),
  vendor: z.string().max(100).optional().nullable(),
  estimated_cost: z.coerce.number().min(0).optional().nullable(),
  actual_cost: z.coerce.number().min(0).optional().nullable(),
  status: z.enum(['pending', 'quoted', 'booked', 'paid', 'cancelled']).default('pending'),
  notes: z.string().max(500).optional().nullable(),
})

export const milestoneSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional().nullable(),
  due_date: z.string().min(1, 'Due date is required'),
  category: z.enum(['booking', 'payments', 'design', 'logistics', 'other']).default('other'),
  priority: z.enum(['1', '2', '3']).default('2'),
  sort_order: z.coerce.number().int().default(0),
})

export const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(100),
  category: z.string().min(1, 'Category is required').max(50),
  contact_name: z.string().max(100).optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  website: z.string().url('Invalid URL').optional().nullable(),
  quote_amount: z.coerce.number().min(0).optional().nullable(),
  status: z.enum(['researching', 'contacted', 'quoted', 'negotiating', 'booked', 'rejected']).default('researching'),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export const guestSchema = z.object({
  name: z.string().min(1, 'Guest name is required').max(100),
  email: z.string().email('Invalid email').optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  plus_one: z.boolean().default(false),
  plus_one_name: z.string().max(100).optional().nullable(),
  rsvp_status: z.enum(['pending', 'yes', 'no', 'maybe']).default('pending'),
  dietary_restrictions: z.string().max(200).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(100),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo'),
  assignee_id: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['1', '2', '3']).default('2'),
  milestone_id: z.string().uuid().optional().nullable(),
  sort_order: z.coerce.number().int().default(0),
})

export const collaboratorSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['editor', 'viewer']).default('editor'),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type BudgetCategoryInput = z.infer<typeof budgetCategorySchema>
export type BudgetItemInput = z.infer<typeof budgetItemSchema>
export type MilestoneInput = z.infer<typeof milestoneSchema>
export type VendorInput = z.infer<typeof vendorSchema>
export type GuestInput = z.infer<typeof guestSchema>
export type TaskInput = z.infer<typeof taskSchema>
export type CollaboratorInput = z.infer<typeof collaboratorSchema>
