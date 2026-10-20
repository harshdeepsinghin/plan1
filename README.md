# 🎉 EventPlanner — GenAI Celebration & Event Planner

> **Hack2Skill Challenge 5 submission** — a full event planning workspace for weddings, birthdays, and community events, with Google Gemini doing the first draft.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel)](https://plan1-zeta.vercel.app)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![AI: Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google)](https://ai.google.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 Challenge vertical

**Celebration & Event Planner (Challenge 5).** Planning a celebration is a long list of connected decisions: the theme, the money, the venue, the vendors, the guest list, and the countdown. EventPlanner turns those decisions into one living plan instead of six disconnected spreadsheets.

## 🚀 Live demo

**https://plan1-zeta.vercel.app**

Create a free account, then create an event. Gemini generates the first theme, budget, and timeline in a few seconds.

## ✨ What it does

### AI generators (8 specialised tools + chat)

| Tool | What it produces |
| --- | --- |
| **Theme generator** | Theme name, description, decor direction, mood keywords, 5-colour palette |
| **Colour palette** | A focused palette with hex codes and usage notes |
| **Budget breakdown** | Category allocations sized to the event budget |
| **Timeline generator** | Milestones from 12+ months out to day-of, with priorities and categories |
| **Vendor suggestions** | Vendor categories, search queries, questions to ask, red flags |
| **Activity ideas** | Entertainment and guest-experience ideas tailored to the event |
| **Checklist generator** | Phase-based planning checklist with priorities |
| **Speech & toast writer** | Multiple drafts for any role and tone |
| **AI chat assistant** | A planning conversation that knows the event's date, venue, guest count, and budget |

### Full event management

- **Budget tracker** — categories, line items, estimated vs actual spend, live totals
- **Timeline** — milestone list, priorities, due dates, overdue states, completion tracking
- **Vendors** — drag-and-drop Kanban (research → contacted → quoted → negotiating → booked), quotes, ratings, contacts
- **Guests** — CSV import/export, RSVP status, groups, plus-ones, dietary notes
- **Tasks** — drag-and-drop Kanban, priorities, due dates, assignees, notes
- **Collaboration** — invite an existing planner as editor or viewer; owner-only settings and deletion
- **Exports** — guest CSV, budget CSV, timeline CSV, full-plan JSON, and an `.ics` calendar file
- **Google links** — add the event to Google Calendar and open the venue in Google Maps

### Design & UX

- Responsive desktop sidebar and mobile navigation
- Dark/light mode with system detection
- shadcn/ui components on Radix primitives
- Loading states, empty states, toasts, and confirmation dialogs
- Server-rendered pages with client-side interactivity where it matters

## 🧠 Approach & logic

### One event context, many AI outputs

Every generator receives the same context: event type, title, date, venue, guest count, budget, spent amount, location, cultural background, and free-text preferences. Prompts live in `src/lib/gemini/prompts.ts` and ask for structured JSON so the UI can render results instead of a wall of text.

### Event creation flow

1. The form validates input with Zod and inserts an `events` row.
2. Three Gemini calls run in parallel: theme, timeline, and budget breakdown.
3. The theme is stored on `events.ai_generated_theme`; timeline rows go into `milestones`; budget rows go into `budget_categories`; raw generations are also kept in `ai_ideas`.
4. AI failures are **non-fatal**. The event is still created, and the planner can retry from the AI Assistant.
5. The user lands on the event overview with the plan already populated.

### Resilient Gemini client

`src/lib/gemini/client.ts` calls the Gemini REST API directly and handles free-tier reality:

- primary model: **Gemini 3.6 Flash**
- fallback chain: Gemini 3.1 Flash-Lite → 3.5 Flash-Lite → 3.5 Flash
- 12-second per-model timeout for structured JSON, with a 45-second total budget
- one backoff retry on `429`, then fall through to the next model
- thinking disabled on full Flash models to keep responses fast
- fenced/prose-wrapped JSON is extracted and parsed
- friendly errors for rate limits and busy endpoints

The model chain can be overridden with `GEMINI_MODEL` and `GEMINI_FALLBACK_MODELS`.

### Data access and permissions

Supabase Row Level Security protects every table. Owners can read and write their own events. Collaborators can read an event once their invitation is accepted; editors can update content; viewers get read-only access. `SECURITY DEFINER` helper functions (`is_event_owner`, `can_access_event`, `can_edit_event`, and category equivalents) avoid recursive RLS policies.

Collaborator invitations target an existing planner account and are granted immediately, so there is no broken "pending forever" state. Event details, collaborator management, and deletion remain owner-only.

### Mutations

All writes are Next.js Server Actions in `src/actions/`. Forms are plain controlled forms or native form submissions, validated with Zod, and revalidate the affected routes after success. No public mutation API is exposed.

## 🛠️ Tech stack (free tiers)

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui, Radix UI, lucide-react |
| Database | Supabase PostgreSQL with Row Level Security |
| Auth | Supabase Auth — email/password, Google OAuth, magic links |
| GenAI | Google Gemini API (Google AI Studio free tier) |
| Deployment | Vercel + Supabase |
| Drag & drop | @dnd-kit |
| Validation | Zod |

## 🏗️ Project structure

```text
src/
├── app/
│   ├── auth/                  # login, signup, callback, password reset
│   ├── (dashboard)/
│   │   ├── dashboard/         # owned + shared events
│   │   ├── events/
│   │   │   ├── new/           # create event + first AI draft
│   │   │   └── [id]/
│   │   │       ├── overview/  # theme, progress, next milestones
│   │   │       ├── budget/    # categories and line items
│   │   │       ├── timeline/  # milestones
│   │   │       ├── vendors/   # vendor Kanban
│   │   │       ├── guests/    # guest list and CSV
│   │   │       ├── tasks/     # task Kanban
│   │   │       ├── ai-assistant/
│   │   │       └── settings/  # details, collaborators, exports
│   │   └── profile/
│   ├── globals.css
│   └── page.tsx               # landing page
├── actions/                   # server actions (auth, events, AI, CRUD)
├── components/                # layout, domain components, shadcn/ui
├── lib/
│   ├── gemini/                # REST client and prompt library
│   ├── supabase/              # browser and server clients
│   ├── validations/           # Zod schemas
│   └── utils.ts
├── proxy.ts                   # session refresh / auth gate
└── types/

supabase/
├── migrations/                # schema, profiles/collaboration, RLS fixes
└── seed.sql
```

## 📦 Getting started

### Prerequisites

- Node.js 18+ and npm
- A free Supabase project
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/)
- A Vercel account (for deployment)

### 1. Clone and install

```bash
git clone https://github.com/harshdeepsinghin/plan1.git
cd plan1
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

GOOGLE_GEMINI_API_KEY=your-gemini-api-key
# Optional overrides:
# GEMINI_MODEL=gemini-3.6-flash
# GEMINI_FALLBACK_MODELS=gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-3.5-flash

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

This applies all three migrations in order. If you prefer, paste the files from `supabase/migrations/` into the Supabase SQL Editor.

### 4. Supabase Auth

In **Authentication → URL Configuration**:

- Site URL: your deployment URL (or `http://localhost:3000`)
- Redirect URLs: `http://localhost:3000/auth/callback`, `https://your-app.vercel.app/auth/callback`

For Google sign-in, enable the **Google** provider in **Authentication → Providers** and add the Supabase callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) to the Google OAuth client's authorised redirect URIs.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Deploy

Push to GitHub, import the repository in Vercel, add the environment variables above, and deploy. Set `NEXT_PUBLIC_APP_URL` to the production URL.

## 🔐 Security

- RLS on every user-facing table
- Server-side session checks in pages and actions
- Owner/editor/viewer permission checks for event mutations
- Zod validation on event and domain inputs
- Secrets only in environment variables; `client_secret_*.json` and `.env*` are gitignored
- Auth callback validates the `next` redirect to prevent open redirects

## 🧪 Testing

```bash
# Type checking
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build
```

The app was exercised end-to-end in Playwright: signup/login, event creation with AI, budget items, timeline milestones, vendors, guests, tasks, AI theme/chat/speech, profile updates, collaborator access, and mobile navigation.

## 📝 Assumptions

1. **One currency** — budgets are displayed in USD, matching the creation form.
2. **Existing accounts for collaboration** — an invite uses a planner email that already has a profile; there is no email delivery service in the free build.
3. **AI is a first draft** — generated plans are editable, and a failed AI call never blocks event creation.
4. **Free-tier limits are real** — Gemini may return rate limits or high-demand errors; the model fallback chain handles the common cases.
5. **Demo scale** — this is a hackathon build, not a multi-tenant production system.
6. **Repo limit** — the repository stays under 10 MB; `node_modules`, build output, local env files, and Playwright artifacts are excluded.
7. **Single branch** — only `main` is used.

## 🔮 Future enhancements

- Email invitations and RSVP notifications (Supabase Edge Functions + Resend)
- Realtime presence and live cursors for collaborators
- Public read-only share links with RSVP
- PDF plan export and printed timelines
- Photo mood boards and vendor attachments
- Calendar sync beyond the one-click Google Calendar link

## 📄 License

MIT — see [LICENSE](LICENSE).

---

Built for **Hack2Skill Challenge 5** with Next.js, Supabase, and Google Gemini.
