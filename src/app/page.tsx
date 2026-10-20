import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BrandLogo } from "@/components/brand/logo"
import {
  Calendar,
  DollarSign,
  Users,
  Truck,
  Bot,
  Sparkles,
  Palette,
  ClipboardList,
  ArrowRight,
} from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "Theme ideas",
    description:
      "Gemini suggests a theme, colour palette, and decor direction. Change anything you do not like.",
  },
  {
    icon: DollarSign,
    title: "Budget",
    description:
      "Set an amount for each category, add expenses, and see what is left.",
  },
  {
    icon: Calendar,
    title: "Timeline",
    description:
      "Milestones from today to the event date, with due dates and priorities.",
  },
  {
    icon: Truck,
    title: "Vendors",
    description:
      "Track vendors from the first call to booked. Keep quotes, contacts, and notes together.",
  },
  {
    icon: Users,
    title: "Guest list",
    description:
      "Import a CSV, track RSVPs and plus-ones, then export the list when it is final.",
  },
  {
    icon: ClipboardList,
    title: "Tasks",
    description:
      "A board for what is left to do, with due dates, priorities, and assignees.",
  },
  {
    icon: Bot,
    title: "Assistant",
    description:
      "Ask about the venue, budget, guests, or run of show. It knows the event details.",
  },
  {
    icon: Palette,
    title: "Speeches",
    description:
      "Draft a speech by role and tone, then edit it until it sounds like you.",
  },
]

const stats = [
  { value: "8", label: "planning tools" },
  { value: "Free", label: "to use" },
  { value: "No limit", label: "events" },
  { value: "2", label: "collaborator roles" },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <BrandLogo href="/" />
          <nav className="flex items-center gap-1.5">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Create account</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Planning with Google Gemini
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight lg:text-6xl">
              One plan for the whole event.
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground lg:text-xl">
              Keep the theme, budget, guests, vendors, and timeline together. Gemini
              writes a first draft you can change.
            </p>
            <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full gap-2 sm:w-auto">
                  Create an account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Sign in
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-6 text-sm text-muted-foreground sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center">
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold lg:text-4xl">What you can do</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Eight tools for the parts of an event that need the most attention.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="h-full transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="mb-4 w-fit rounded-xl bg-primary/10 p-3 text-primary">
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

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold lg:text-4xl">How it works</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              From a blank event to a plan you can follow.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              {
                step: "01",
                title: "Create the event",
                desc: "Add the date, venue, guest count, and budget.",
              },
              {
                step: "02",
                title: "Get a first draft",
                desc: "Gemini suggests a theme, budget split, and timeline. Keep what works.",
              },
              {
                step: "03",
                title: "Work through the details",
                desc: "Track vendors, guests, tasks, and payments as the date gets closer.",
              },
              {
                step: "04",
                title: "Share or export",
                desc: "Invite a co-planner, add the date to Google Calendar, or export your lists.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="absolute left-1/2 top-0 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {item.step}
                </div>
                <div className="pt-16 text-center">
                  <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold lg:text-4xl">What it runs on</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              The project uses free plans from Vercel, Supabase, and Google.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Next.js on Vercel",
                desc: "Frontend and hosting",
                free: "Hobby plan",
              },
              {
                name: "Supabase",
                desc: "Postgres, auth, and access rules",
                free: "Free plan",
              },
              {
                name: "Google Gemini",
                desc: "Drafts and chat",
                free: "Free API tier",
              },
            ].map((tech) => (
              <Card key={tech.name} className="p-6 text-center">
                <h3 className="mb-2 text-xl font-semibold">{tech.name}</h3>
                <p className="mb-2 text-muted-foreground">{tech.desc}</p>
                <Badge
                  variant="secondary"
                  className="border-green-200 bg-green-100 text-green-700"
                >
                  {tech.free}
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Card className="mx-auto max-w-2xl bg-primary text-primary-foreground">
            <CardContent className="p-8 lg:p-12">
              <h2 className="mb-4 text-3xl font-bold lg:text-4xl">Start with one event</h2>
              <p className="mb-8 text-lg opacity-90">
                Create an account, add the basics, and edit the draft Gemini gives you.
              </p>
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="gap-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  Create an account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t bg-muted/50 py-12">
        <div className="container mx-auto flex flex-col items-center px-4 text-center text-muted-foreground">
          <BrandLogo href="/" className="mb-4" />
          <p className="font-medium text-foreground">Plan events without the spreadsheet mess.</p>
          <p className="mt-2 text-sm">
            Built for Hack2Skill Challenge 5. Runs on Next.js, Supabase, and Google Gemini.
          </p>
        </div>
      </footer>
    </div>
  )
}
