export type EventType = 'wedding' | 'birthday' | 'community' | 'other'
export type EventStatus = 'planning' | 'active' | 'completed' | 'cancelled'
export type BudgetItemStatus = 'pending' | 'quoted' | 'booked' | 'paid' | 'cancelled'
export type MilestoneCategory = 'booking' | 'payments' | 'design' | 'logistics' | 'other'
export type VendorStatus = 'researching' | 'contacted' | 'quoted' | 'negotiating' | 'booked' | 'rejected'
export type RSVPStatus = 'pending' | 'yes' | 'no' | 'maybe'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type Priority = 1 | 2 | 3
export type CollaboratorRole = 'owner' | 'editor' | 'viewer'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  user_id: string
  title: string
  event_type: EventType
  event_date: string
  venue: string | null
  guest_count: number
  budget_total: number
  budget_spent: number
  status: EventStatus
  ai_generated_theme: AiTheme | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface AiTheme {
  theme_name: string
  description: string
  color_palette: ColorPalette
  mood_board_keywords: string[]
  decor_style: string
}

export interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  neutral: string
  highlight: string
}

export interface BudgetCategory {
  id: string
  event_id: string
  name: string
  allocated: number
  spent: number
  sort_order: number
}

export interface BudgetItem {
  id: string
  category_id: string
  name: string
  vendor: string | null
  estimated_cost: number | null
  actual_cost: number | null
  status: BudgetItemStatus
  notes: string | null
  created_at: string
}

export interface Milestone {
  id: string
  event_id: string
  title: string
  description: string | null
  due_date: string
  completed: boolean
  completed_at: string | null
  category: MilestoneCategory
  priority: Priority
  sort_order: number
}

export interface Vendor {
  id: string
  event_id: string
  name: string
  category: string
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  quote_amount: number | null
  status: VendorStatus
  rating: number | null
  notes: string | null
  created_at: string
}

export interface Guest {
  id: string
  event_id: string
  name: string
  email: string | null
  phone: string | null
  category: string | null
  plus_one: boolean
  plus_one_name: string | null
  rsvp_status: RSVPStatus
  dietary_restrictions: string | null
  notes: string | null
  created_at: string
}

export interface Task {
  id: string
  event_id: string
  title: string
  description: string | null
  status: TaskStatus
  assignee_id: string | null
  due_date: string | null
  priority: Priority
  milestone_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AiIdea {
  id: string
  event_id: string
  idea_type: string
  content: Record<string, unknown>
  prompt_used: string | null
  created_at: string
}

export interface EventCollaborator {
  id: string
  event_id: string
  user_id: string
  role: CollaboratorRole
  invited_at: string
  accepted_at: string | null
  profiles?: Profile
}
