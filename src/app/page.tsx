import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, DollarSign, Users, Truck, Bot, Sparkles, 
  CheckCircle, ArrowRight, Star, Palette, ClipboardList 
} from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "AI Theme Generator",
    description: "Get personalized themes, color palettes, and decor styles tailored to your event type, budget, and preferences."
  },
  {
    icon: DollarSign,
    title: "Smart Budget Tracker",
    description: "Auto-generated budget breakdowns with category allocations, real-time tracking, and variance alerts."
  },
  {
    icon: Calendar,
    title: "Intelligent Timeline",
    description: "Week-by-week milestones generated from your event date with priorities, categories, and drag-and-drop reordering."
  },
  {
    icon: Truck,
    title: "Vendor Management",
    description: "Kanban-style vendor pipeline from research to booked, with quotes, ratings, and AI-suggested questions."
  },
  {
    icon: Users,
    title: "Guest List & RSVP",
    description: "Import guests via CSV, track RSVPs, dietary restrictions, plus-ones, and send invitations."
  },
  {
    icon: ClipboardList,
    title: "Task Kanban Board",
    description: "Drag-and-drop task management with assignees, due dates, priorities, and milestone linking."
  },
  {
    icon: Bot,
    title: "AI Chat Assistant",
    description: "Context-aware chat that knows your event details and helps with planning decisions in real-time."
  },
  {
    icon: Palette,
    title: "Speech & Toast Writer",
    description: "Generate personalized speeches for any role (best man, father of bride, etc.) with multiple draft variations."
  },
]

const stats = [
  { value: "8", label: "AI Generators" },
  { value: "100%", label: "Free Tier" },
  { value: "∞", label: "Events" },
  { value: "Real-time", label: "Collaboration" },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Star className="h-4 w-4" />
              GenAI-Powered Event Planning
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
              Plan Perfect Events with <span className="text-primary">AI</span>
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              From weddings to birthdays to community events — get personalized themes, smart budgets, 
              intelligent timelines, and vendor management all powered by Google Gemini AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  <Sparkles className="h-5 w-5" />
                  Start Free — No Credit Card
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              {stats.map((stat, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Everything You Need to Plan</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Eight powerful AI generators plus full event management tools — all free on generous tiers.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <Card key={i} className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mb-4">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From idea to execution in four simple steps
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: "01", title: "Create Event", desc: "Enter event type, date, budget, and guest count. AI instantly generates a personalized theme, timeline, and budget breakdown." },
              { step: "02", title: "Customize with AI", desc: "Use 8 specialized AI generators for themes, colors, vendors, activities, checklists, speeches, and more." },
              { step: "03", title: "Manage & Collaborate", desc: "Track budget, vendors, guests, and tasks. Invite co-planners with editor or viewer roles." },
              { step: "04", title: "Execute & Celebrate", desc: "Export summaries, share read-only links with guests, and enjoy your perfectly planned event!" },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {item.step}
                </div>
                <div className="pt-16 text-center">
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Built with Best-in-Class Free Tiers</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every service we use has a generous free tier — no surprise bills, ever.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { name: "Next.js + Vercel", desc: "Frontend & hosting", free: "Unlimited personal projects, 100GB bandwidth" },
              { name: "Supabase (PostgreSQL)", desc: "Database & Auth", free: "500MB DB, unlimited users, OAuth, RLS" },
              { name: "Google Gemini API", desc: "Generative AI", free: "1,500 requests/day (gemini-1.5-flash)" },
            ].map((tech, i) => (
              <Card key={i} className="text-center p-6">
                <h3 className="text-xl font-semibold mb-2">{tech.name}</h3>
                <p className="text-muted-foreground mb-2">{tech.desc}</p>
                <Badge variant="secondary" className="text-green-600 bg-green-100 border-green-200">
                  {tech.free}
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Card className="bg-primary text-primary-foreground max-w-2xl mx-auto">
            <CardContent className="p-8 lg:p-12">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Ready to Plan Your Perfect Event?</h2>
              <p className="text-lg opacity-90 mb-8">
                Join thousands of planners using AI to create unforgettable celebrations. 
                Free forever on generous tiers.
              </p>
              <Link href="/auth/signup">
                <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2">
                  <Sparkles className="h-5 w-5" />
                  Create Your First Event Free
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-muted/50">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>Built for Hack2Skill Challenge 5 — Celebration & Event Planner</p>
          <p className="mt-2 text-sm">Powered by Next.js, Supabase, and Google Gemini AI</p>
        </div>
      </footer>
    </div>
  )
}
