import { EventType, AiTheme, ColorPalette } from '@/types/database'

interface EventContext {
  event_type: EventType | string
  title: string
  event_date: string
  venue?: string
  guest_count: number
  budget_total: number
  budget_spent: number
  preferences?: string
  cultural_background?: string
  location?: string
}

export function buildThemePrompt(context: EventContext): string {
  return `You are an expert event planner and creative director. Generate a unique, personalized theme for a ${context.event_type}.

Event Details:
- Title: "${context.title}"
- Type: ${context.event_type}
- Date: ${context.event_date}
- Venue: ${context.venue || 'Not selected yet'}
- Guest Count: ${context.guest_count}
- Budget: $${context.budget_total.toLocaleString()}
- Location: ${context.location || 'Not specified'}
- Cultural Background: ${context.cultural_background || 'Not specified'}
- Preferences: ${context.preferences || 'None specified'}

Generate a cohesive theme that includes:
1. A creative theme name
2. A compelling description (2-3 sentences)
3. A 5-color palette with hex codes and usage notes
4. 5-7 mood board keywords for visual inspiration
5. A decor style description

Output ONLY valid JSON in this exact format:
{
  "theme_name": "string",
  "description": "string",
  "color_palette": {
    "primary": "hex code",
    "secondary": "hex code", 
    "accent": "hex code",
    "neutral": "hex code",
    "highlight": "hex code"
  },
  "mood_board_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "decor_style": "string"
}`
}

export function buildColorPalettePrompt(context: EventContext, existingTheme?: AiTheme): string {
  const themeInfo = existingTheme 
    ? `Existing theme: "${existingTheme.theme_name}" - ${existingTheme.description}`
    : 'No existing theme - create from scratch'

  return `You are a professional color consultant for events. Create a stunning 5-color palette for a ${context.event_type}.

${themeInfo}

Event Details:
- Type: ${context.event_type}
- Date: ${context.event_date} (season: ${getSeason(context.event_date)})
- Venue: ${context.venue || 'Not selected'}
- Guest Count: ${context.guest_count}
- Cultural Background: ${context.cultural_background || 'Not specified'}

Generate a sophisticated color palette with:
1. Primary - Main dominant color
2. Secondary - Complementary supporting color
3. Accent - Pop color for highlights/details
4. Neutral - Base/background color
5. Highlight - Metallic or special finish color

For each color provide: hex code, color name, and usage notes (where to use it).

Output ONLY valid JSON:
{
  "palette": [
    {"role": "primary", "hex": "#...", "name": "...", "usage": "..."},
    {"role": "secondary", "hex": "#...", "name": "...", "usage": "..."},
    {"role": "accent", "hex": "#...", "name": "...", "usage": "..."},
    {"role": "neutral", "hex": "#...", "name": "...", "usage": "..."},
    {"role": "highlight", "hex": "#...", "name": "...", "usage": "..."}
  ]
}`
}

export function buildVendorSuggestionsPrompt(context: EventContext): string {
  return `You are an expert event vendor consultant. Suggest vendor categories and specific search strategies for a ${context.event_type}.

Event Details:
- Type: ${context.event_type}
- Date: ${context.event_date}
- Venue: ${context.venue || 'Not selected'}
- Guest Count: ${context.guest_count}
- Budget: $${context.budget_total.toLocaleString()}
- Location: ${context.location || 'Not specified'}

Provide 8-10 vendor categories with specific guidance for each. Focus on categories relevant to this event type and budget.

Output ONLY valid JSON:
{
  "vendors": [
    {
      "category": "Venue",
      "priority": "high",
      "budget_percentage": 30,
      "search_queries": ["wedding venues near me", "outdoor wedding venues"],
      "questions_to_ask": ["What's included in the rental?", "Capacity limits?", "Vendor restrictions?"],
      "red_flags": ["Hidden fees", "Poor reviews", "Inflexible policies"],
      "tips": ["Book 12-18 months ahead", "Visit at same time of day as event"]
    }
  ]
}`
}

export function buildTimelinePrompt(context: EventContext): string {
  const monthsUntil = Math.ceil((new Date(context.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
  
  return `You are an expert event planner creating a comprehensive timeline. Generate a week-by-week milestone plan for a ${context.event_type} in ${monthsUntil} months.

Event Details:
- Type: ${context.event_type}
- Date: ${context.event_date}
- Guest Count: ${context.guest_count}
- Budget: $${context.budget_total.toLocaleString()}
- Venue: ${context.venue || 'Not booked yet'}

Create milestones organized by category (booking, payments, design, logistics, other) with priorities (1=high, 2=medium, 3=low). Include specific, actionable tasks with realistic deadlines working backwards from the event date.

Output ONLY valid JSON:
{
  "milestones": [
    {
      "title": "Book Venue",
      "description": "Research, visit, and secure ceremony/reception venue",
      "due_date": "YYYY-MM-DD",
      "category": "booking",
      "priority": 1,
      "sort_order": 1
    }
  ]
}`
}

export function buildBudgetBreakdownPrompt(context: EventContext): string {
  return `You are an expert event budget planner. Create a detailed budget breakdown with category allocations for a ${context.event_type}.

Event Details:
- Type: ${context.event_type}
- Total Budget: $${context.budget_total.toLocaleString()}
- Guest Count: ${context.guest_count}
- Location: ${context.location || 'Not specified'}
- Date: ${context.event_date}

Provide realistic percentage allocations for each category based on industry standards for this event type. Include cost-saving tips for each category.

Output ONLY valid JSON:
{
  "categories": [
    {
      "name": "Venue & Rentals",
      "percentage": 30,
      "amount": 15000,
      "items": ["Venue rental", "Tables/chairs", "Linens", "Lighting"],
      "tips": ["Negotiate package deals", "Off-season discounts"]
    }
  ],
  "total_allocated": 50000,
  "contingency_percentage": 10
}`
}

export function buildActivityIdeasPrompt(context: EventContext): string {
  return `You are a creative event designer. Generate unique, memorable activity ideas for a ${context.event_type}.

Event Details:
- Type: ${context.event_type}
- Guest Count: ${context.guest_count}
- Venue: ${context.venue || 'Not specified'}
- Date: ${context.event_date}
- Cultural Background: ${context.cultural_background || 'Not specified'}
- Demographics: Mixed ages (assume unless specified)

Create 8-12 unique activities tailored to this event type. Include both traditional and innovative ideas.

Output ONLY valid JSON:
{
  "activities": [
    {
      "title": "Custom Cocktail Station",
      "description": "Interactive mixology station where guests create signature drinks",
      "category": "entertainment",
      "duration_minutes": 120,
      "materials_needed": ["Professional bartender", "Premium spirits", "Fresh ingredients", "Glassware"],
      "setup_complexity": "medium",
      "guest_appeal": "high",
      "estimated_cost": 800
    }
  ]
}`
}

export function buildChecklistPrompt(context: EventContext): string {
  return `You are an expert event planner creating a comprehensive checklist. Generate a categorized checklist for a ${context.event_type}.

Event Details:
- Type: ${context.event_type}
- Date: ${context.event_date}
- Guest Count: ${context.guest_count}

Create a detailed checklist organized by timeline phases (12+ months, 9-12 months, 6-9 months, 3-6 months, 1-3 months, 1 month, 2 weeks, 1 week, day of).

Output ONLY valid JSON:
{
  "checklist": [
    {
      "phase": "12+ Months Before",
      "items": [
        {"task": "Set budget", "category": "budget", "priority": 1},
        {"task": "Create guest list", "category": "guests", "priority": 1}
      ]
    }
  ]
}`
}

export function buildSpeechPrompt(context: EventContext, role: string, relationship: string, tone: string, keyMemories: string): string {
  return `You are a professional speech writer. Create a heartfelt ${role} speech/toast for a ${context.event_type}.

Context:
- Role: ${role} (e.g., father of bride, best man, maid of honor, birthday person)
- Relationship to honoree: ${relationship}
- Desired tone: ${tone} (funny, sentimental, inspirational, mixed)
- Key memories/stories to include: ${keyMemories}
- Event type: ${context.event_type}
- Guest count: ${context.guest_count}

Write 3 distinct draft variations:
1. Short & sweet (1-2 minutes)
2. Standard (3-4 minutes) 
3. Extended (5+ minutes)

Each should have: opening, body (with specific memories), closing/toast.

Output ONLY valid JSON:
{
  "drafts": [
    {
      "variation": "short",
      "title": "Short & Sweet",
      "estimated_duration_minutes": 2,
      "outline": ["Opening", "Memory 1", "Closing toast"],
      "full_text": "..."
    }
  ]
}`
}

export function buildChatPrompt(context: EventContext, userMessage: string, history: Array<{role: string, content: string}>): string {
  const historyText = history.map(h => `${h.role}: ${h.content}`).join('\n')
  
  return `You are an expert event planning AI assistant. Help the user with their ${context.event_type} planning.

Event Context:
- Title: "${context.title}"
- Type: ${context.event_type}
- Date: ${context.event_date}
- Venue: ${context.venue || 'Not booked'}
- Guests: ${context.guest_count}
- Budget: $${context.budget_total.toLocaleString()} (Spent: $${context.budget_spent.toLocaleString()})
- Status: ${context.budget_spent > 0 ? 'In progress' : 'Just started'}

Conversation History:
${historyText}

User: ${userMessage}

Respond as a helpful, knowledgeable event planner. Be specific, actionable, and encouraging. If they ask for ideas, give creative suggestions. If they ask for advice, give expert guidance. Keep responses concise but thorough.`
}

function getSeason(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth()
  if (month >= 2 && month <= 4) return 'Spring'
  if (month >= 5 && month <= 7) return 'Summer'
  if (month >= 8 && month <= 10) return 'Fall'
  return 'Winter'
}
