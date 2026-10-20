import { z } from 'zod'

/** Convert empty form values to null so optional fields validate cleanly. */
const emptyToNull = (value: unknown) => {
  if (typeof value === 'string' && value.trim() === '') return null
  return value
}

const optionalString = (max: number, message?: string) =>
  z.preprocess(
    emptyToNull,
    z.string().max(max, message).optional().nullable()
  )

const optionalEmail = () =>
  z.preprocess(
    emptyToNull,
    z.string().email('Invalid email').optional().nullable()
  )

const optionalUrl = () =>
  z.preprocess(
    emptyToNull,
    z.string().url('Invalid URL').optional().nullable()
  )

const optionalNumber = (schema: z.ZodType<number, any, any>) =>
  z.preprocess(emptyToNull, schema.optional().nullable())

const optionalUuid = () =>
  z.preprocess(emptyToNull, z.string().uuid().optional().nullable())

const checkbox = z.preprocess(
  (value) =>
    value === undefined
      ? undefined
      : value === true || value === 'true' || value === 'on' || value === '1',
  z.boolean().optional()
)

const requiredCheckbox = z.preprocess(
  (value) => value === true || value === 'true' || value === 'on' || value === '1',
  z.boolean()
)

export const eventTypeSchema = z.enum(['wedding', 'birthday', 'community', 'other'])
export const eventStatusSchema = z.enum(['planning', 'active', 'completed', 'cancelled'])

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  event_type: eventTypeSchema,
  event_date: z.string().min(1, 'Event date is required'),
  venue: optionalString(200),
  guest_count: z.coerce.number().int().min(0).default(0),
  budget_total: z.coerce.number().min(0).default(0),
})

export const updateEventSchema = createEventSchema.partial().extend({
  status: eventStatusSchema.optional(),
  ai_generated_theme: z.any().optional(),
  budget_spent: z.coerce.number().min(0).optional(),
})

export const budgetCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  allocated: z.coerce.number().min(0).default(0),
  sort_order: z.coerce.number().int().default(0),
})

export const budgetItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(100),
  vendor: optionalString(100),
  estimated_cost: optionalNumber(z.coerce.number().min(0)),
  actual_cost: optionalNumber(z.coerce.number().min(0)),
  status: z.enum(['pending', 'quoted', 'booked', 'paid', 'cancelled']).default('pending'),
  notes: optionalString(500),
})

export const milestoneSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: optionalString(500),
  due_date: z.string().min(1, 'Due date is required'),
  category: z.enum(['booking', 'payments', 'design', 'logistics', 'other']).default('other'),
  priority: z.coerce.number().int().min(1).max(3).default(2),
  sort_order: z.coerce.number().int().default(0),
  completed: checkbox.optional(),
})

export const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(100),
  category: z.string().min(1, 'Category is required').max(50),
  contact_name: optionalString(100),
  email: optionalEmail(),
  phone: optionalString(20),
  website: optionalUrl(),
  quote_amount: optionalNumber(z.coerce.number().min(0)),
  status: z.enum(['researching', 'contacted', 'quoted', 'negotiating', 'booked', 'rejected']).default('researching'),
  rating: optionalNumber(z.coerce.number().int().min(1).max(5)),
  notes: optionalString(500),
})

export const guestSchema = z.object({
  name: z.string().min(1, 'Guest name is required').max(100),
  email: optionalEmail(),
  phone: optionalString(20),
  category: optionalString(50),
  plus_one: requiredCheckbox.default(false),
  plus_one_name: optionalString(100),
  rsvp_status: z.enum(['pending', 'yes', 'no', 'maybe']).default('pending'),
  dietary_restrictions: optionalString(200),
  notes: optionalString(500),
})

export const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(100),
  description: optionalString(500),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo'),
  assignee_id: optionalUuid(),
  due_date: z.preprocess(emptyToNull, z.string().optional().nullable()),
  priority: z.coerce.number().int().min(1).max(3).default(2),
  milestone_id: optionalUuid(),
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
