"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  generateTheme,
  generateColorPalette,
  generateVendorSuggestions,
  generateTimeline,
  generateBudgetBreakdown,
  generateActivityIdeas,
  generateChecklist,
  generateSpeech,
  chatWithAI,
} from "@/actions/ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import {
  Sparkles,
  Palette,
  Truck,
  CalendarDays,
  DollarSign,
  PartyPopper,
  ListChecks,
  Loader2,
  Copy,
  Send,
  Bot,
  User,
  MessageSquare,
  Wand2,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { cn, formatCurrency, formatDate, getThemeColors, getThemeKeywords } from "@/lib/utils"

interface SavedIdea {
  id: string
  idea_type: string
  content: any
  created_at: string
}

interface Props {
  eventId: string
  event: any
  initialIdeas: SavedIdea[]
  initialAction?: string
}

interface Generated {
  type: string
  data: any
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

const GENERATORS = [
  {
    id: "theme",
    title: "Signature theme",
    description: "A creative concept, story, mood words, and decor direction.",
    icon: Sparkles,
    run: generateTheme,
  },
  {
    id: "palette",
    title: "Colour palette",
    description: "A five-colour palette with hex codes and usage notes.",
    icon: Palette,
    run: generateColorPalette,
  },
  {
    id: "vendors",
    title: "Vendor shortlist",
    description: "Suggested vendor types, questions to ask, and budget ranges.",
    icon: Truck,
    run: generateVendorSuggestions,
  },
  {
    id: "timeline",
    title: "Planning timeline",
    description: "A realistic countdown of milestones from today to event day.",
    icon: CalendarDays,
    run: generateTimeline,
  },
  {
    id: "budget",
    title: "Budget breakdown",
    description: "Category-by-category allocation tailored to the budget.",
    icon: DollarSign,
    run: generateBudgetBreakdown,
  },
  {
    id: "activities",
    title: "Activities & moments",
    description: "Entertainment ideas, rituals, and memorable guest moments.",
    icon: PartyPopper,
    run: generateActivityIdeas,
  },
  {
    id: "checklist",
    title: "Master checklist",
    description: "A comprehensive to-do list grouped by phase and priority.",
    icon: ListChecks,
    run: generateChecklist,
  },
]

const TYPE_LABELS: Record<string, string> = {
  theme: "Signature theme",
  color_palette: "Colour palette",
  palette: "Colour palette",
  vendor_suggestions: "Vendor shortlist",
  timeline: "Planning timeline",
  budget_breakdown: "Budget breakdown",
  activities: "Activities & moments",
  checklist: "Master checklist",
  speech: "Speech draft",
}

export function AIAssistantClient({ eventId, event, initialIdeas, initialAction }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [tab, setTab] = useState("studio")
  const [generating, setGenerating] = useState<string | null>(null)
  const [generated, setGenerated] = useState<Generated | null>(null)
  const [ideas, setIdeas] = useState<SavedIdea[]>(initialIdeas)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi! I'm your AI planning partner for “${event.title}”. Ask me anything about the venue, budget, guest experience, or the run of show.`,
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatting, setChatting] = useState(false)
  const [speechLoading, setSpeechLoading] = useState(false)
  const [speechResult, setSpeechResult] = useState<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialAction) {
      const generator = GENERATORS.find((item) => item.id === initialAction)
      if (generator) {
        void runGenerator(generator)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages, chatting])

  async function runGenerator(generator: (typeof GENERATORS)[number]) {
    setGenerating(generator.id)
    try {
      const data = await generator.run(eventId)
      setGenerated({ type: generator.id, data })
      setIdeas((current) => [
        {
          id: `${Date.now()}`,
          idea_type: generator.id,
          content: data,
          created_at: new Date().toISOString(),
        },
        ...current,
      ])
      toast({ title: `${generator.title} generated`, description: "Saved to your AI ideas." })
      router.refresh()
    } catch (error) {
      toast({
        title: "AI generation failed",
        description:
          error instanceof Error
            ? error.message
            : "The AI service is unavailable right now. Please try again.",
        variant: "destructive",
      })
    } finally {
      setGenerating(null)
    }
  }

  async function handleSend(message?: string) {
    const text = (message ?? chatInput).trim()
    if (!text || chatting) return

    const history = chatMessages.map((item) => ({ role: item.role, content: item.content }))
    setChatMessages((current) => [...current, { role: "user", content: text }])
    setChatInput("")
    setChatting(true)

    try {
      const response = await chatWithAI(eventId, text, history)
      setChatMessages((current) => [...current, { role: "assistant", content: response }])
    } catch (error) {
      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `Sorry — I hit an error: ${error.message}`
              : "Sorry — I couldn't reach the AI service. Please try again.",
        },
      ])
    } finally {
      setChatting(false)
    }
  }

  async function handleSpeech(formData: FormData) {
    setSpeechLoading(true)
    setSpeechResult(null)
    try {
      const result = await generateSpeech(
        eventId,
        String(formData.get("role") || "friend"),
        String(formData.get("relationship") || ""),
        String(formData.get("tone") || "heartfelt"),
        String(formData.get("memories") || "")
      )
      setSpeechResult(result)
      setIdeas((current) => [
        {
          id: `${Date.now()}`,
          idea_type: "speech",
          content: result,
          created_at: new Date().toISOString(),
        },
        ...current,
      ])
      toast({ title: "Speech draft ready" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not write the speech",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setSpeechLoading(false)
    }
  }

  function copyJson() {
    if (!generated) return
    navigator.clipboard.writeText(JSON.stringify(generated.data, null, 2))
    toast({ title: "Copied to clipboard" })
  }

  const speechDrafts: any[] = Array.isArray(speechResult?.drafts) ? speechResult.drafts : []
  const speechText =
    speechResult?.content ||
    speechResult?.speech ||
    speechDrafts
      .map((draft) => `${draft.title || draft.variation}\n\n${draft.full_text || ""}`)
      .join("\n\n") ||
    (speechResult ? JSON.stringify(speechResult, null, 2) : "")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Bot className="h-6 w-6 text-primary" />
            AI Assistant
          </h1>
          <p className="text-sm text-muted-foreground">
            Gemini-powered ideas for every part of {event.title}.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          Google Gemini
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="studio">
            <Wand2 className="mr-1.5 h-4 w-4" />
            Studio
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="mr-1.5 h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="speech">
            <Lightbulb className="mr-1.5 h-4 w-4" />
            Speech writer
          </TabsTrigger>
          <TabsTrigger value="saved">
            <Sparkles className="mr-1.5 h-4 w-4" />
            Saved ideas ({ideas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="studio" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {GENERATORS.map((generator) => {
              const Icon = generator.icon
              const isRunning = generating === generator.id

              return (
                <Card key={generator.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{generator.title}</CardTitle>
                    <CardDescription>{generator.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <Button
                      className="w-full"
                      variant={isRunning ? "secondary" : "outline"}
                      onClick={() => runGenerator(generator)}
                      disabled={generating !== null}
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <Card className="flex h-[600px] max-h-[75vh] flex-col">
            <CardHeader className="border-b py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4 text-primary" />
                Planning chat
              </CardTitle>
            </CardHeader>
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {chatting ? (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl bg-muted px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="border-t p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[
                  "Suggest a run of show",
                  "How can I reduce costs?",
                  "Ideas to entertain kids",
                ].map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleSend(prompt)}
                    disabled={chatting}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
              <form
                onSubmit={(formEvent) => {
                  formEvent.preventDefault()
                  void handleSend()
                }}
                className="flex gap-2"
              >
                <Input
                  value={chatInput}
                  onChange={(changeEvent) => setChatInput(changeEvent.target.value)}
                  placeholder="Ask your planning assistant…"
                  disabled={chatting}
                />
                <Button type="submit" size="icon" disabled={chatting || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="speech" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Speech & toast writer
                </CardTitle>
                <CardDescription>
                  A heartfelt draft you can personalise in seconds.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={handleSpeech} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="speech-role">Your role</Label>
                      <select
                        id="speech-role"
                        name="role"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        defaultValue="friend"
                      >
                        <option value="partner">Partner</option>
                        <option value="parent">Parent</option>
                        <option value="sibling">Sibling</option>
                        <option value="friend">Friend</option>
                        <option value="colleague">Colleague</option>
                        <option value="host">Host</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="speech-tone">Tone</Label>
                      <select
                        id="speech-tone"
                        name="tone"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        defaultValue="heartfelt"
                      >
                        <option value="heartfelt">Heartfelt</option>
                        <option value="funny">Funny</option>
                        <option value="formal">Formal</option>
                        <option value="short">Short & sweet</option>
                        <option value="roast">Loving roast</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="speech-relationship">Relationship</Label>
                    <Input
                      id="speech-relationship"
                      name="relationship"
                      placeholder="e.g. Best friends since university"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="speech-memories">Key memories or details</Label>
                    <Textarea
                      id="speech-memories"
                      name="memories"
                      rows={4}
                      placeholder="Inside jokes, milestones, qualities you love…"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={speechLoading}>
                    {speechLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Writing…
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Write my speech
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your draft</CardTitle>
                <CardDescription>
                  {speechResult ? "Copy, tweak, and make it yours." : "Your speech will appear here."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {speechResult ? (
                  <div className="space-y-3">
                    {speechDrafts.length > 0 ? (
                      <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
                        {speechDrafts.map((draft: any, index: number) => (
                          <div key={index} className="rounded-xl border p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="font-semibold">
                                {draft.title || draft.variation || `Draft ${index + 1}`}
                              </h3>
                              {draft.estimated_duration_minutes ? (
                                <Badge variant="outline">
                                  ~{draft.estimated_duration_minutes} min
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                              {draft.full_text ||
                                draft.content ||
                                (Array.isArray(draft.outline) ? draft.outline.join(" → ") : "")}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold">
                          {speechResult.title || "A few words"}
                        </h3>
                        <div className="max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted p-4 text-sm leading-relaxed">
                          {speechText}
                        </div>
                      </>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(speechText)
                        toast({ title: "Speech copied" })
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy draft{speechDrafts.length > 1 ? "s" : ""}
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center text-center text-sm text-muted-foreground">
                    <MessageSquare className="mb-2 h-8 w-8 opacity-40" />
                    Fill in a few details and Gemini will draft it for you.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          {ideas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center text-sm text-muted-foreground">
                Nothing saved yet. Generate something in the Studio tab.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {ideas.map((idea) => (
                <SavedIdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={generated !== null} onOpenChange={(open) => !open && setGenerated(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {generated ? TYPE_LABELS[generated.type] || generated.type : "Generated"}
            </DialogTitle>
            <DialogDescription>Freshly generated with Google Gemini.</DialogDescription>
          </DialogHeader>
          {generated ? (
            <div className="space-y-4">
              <GeneratedContent type={generated.type} data={generated.data} />
              <div className="flex justify-end">
                <Button variant="outline" onClick={copyJson}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy JSON
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function GeneratedContent({ type, data }: { type: string; data: any }) {
  if (!data) return null

  if (type === "theme") {
    const palette = getThemeColors(data)
    const keywords = getThemeKeywords(data)

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold">{data.theme_name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{data.description}</p>
        </div>
        {palette.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium">Palette</p>
            <div className="grid grid-cols-5 gap-2">
              {palette.map((color, index) => (
                <div key={index} className="space-y-1">
                  <div
                    className="h-14 rounded-lg border"
                    style={{ backgroundColor: String(color.hex || "#eee") }}
                  />
                  <p className="truncate text-[10px] text-muted-foreground">{color.hex}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {keywords.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((keyword: string) => (
              <Badge key={keyword} variant="secondary">
                {keyword}
              </Badge>
            ))}
          </div>
        ) : null}
        {data.decor_style ? (
          <div>
            <p className="text-sm font-medium">Decor direction</p>
            <p className="text-sm text-muted-foreground">{data.decor_style}</p>
          </div>
        ) : null}
        <RawJson data={data} />
      </div>
    )
  }

  if (type === "palette") {
    const colors = data.colors || data.palette?.colors || data.palette || []
    return (
      <div className="space-y-3">
        {Array.isArray(colors) && colors.length > 0 ? (
          <div className="grid grid-cols-5 gap-2">
            {colors.map((color: any, index: number) => (
              <div key={index} className="space-y-1">
                <div
                  className="h-16 rounded-lg border"
                  style={{ backgroundColor: String(color.hex || color || "#eee") }}
                />
                <p className="truncate text-[10px] text-muted-foreground">
                  {typeof color === "string" ? color : color.hex}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        <RawJson data={data} />
      </div>
    )
  }

  if (type === "timeline") {
    const milestones = data.milestones || []
    return (
      <div className="space-y-2">
        {milestones.map((milestone: any, index: number) => (
          <div key={index} className="flex items-start gap-3 rounded-lg border p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {index + 1}
            </div>
            <div>
              <p className="text-sm font-medium">{milestone.title}</p>
              <p className="text-xs text-muted-foreground">
                {milestone.due_date || milestone.date} · {milestone.category || "planning"}
              </p>
              {milestone.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{milestone.description}</p>
              ) : null}
            </div>
          </div>
        ))}
        <RawJson data={data} />
      </div>
    )
  }

  if (type === "budget") {
    const categories = data.categories || []
    const total = categories.reduce((sum: number, category: any) => sum + Number(category.amount || 0), 0)
    return (
      <div className="space-y-2">
        {categories.map((category: any, index: number) => (
          <div key={index} className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <div>
              <p className="font-medium">{category.name}</p>
              {category.description ? (
                <p className="text-xs text-muted-foreground">{category.description}</p>
              ) : null}
            </div>
            <span className="font-semibold">{formatCurrency(Number(category.amount || 0))}</span>
          </div>
        ))}
        <p className="text-right text-sm font-semibold">Total: {formatCurrency(total)}</p>
        <RawJson data={data} />
      </div>
    )
  }

  return <RawJson data={data} />
}

function RawJson({ data }: { data: any }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Full AI response
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open ? (
        <pre className="max-h-72 overflow-auto border-t bg-muted/50 p-3 text-[11px]">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}
    </div>
  )
}

function SavedIdeaCard({ idea }: { idea: SavedIdea }) {
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div>
          <p className="font-medium">{TYPE_LABELS[idea.idea_type] || idea.idea_type}</p>
          <p className="text-xs text-muted-foreground">{formatDate(idea.created_at)}</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open ? (
        <CardContent className="border-t pt-4">
          <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-[11px]">
            {JSON.stringify(idea.content, null, 2)}
          </pre>
        </CardContent>
      ) : null}
    </Card>
  )
}
