"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Bot, Star, Palette, Truck, Calendar, DollarSign, 
  ClipboardList, Sparkles, Loader2, Send, Copy, 
  ChevronDown, ChevronUp, MessageSquare, Zap 
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { generateTheme, generateColorPalette, generateVendorSuggestions, generateTimeline, generateBudgetBreakdown, generateActivityIdeas, generateChecklist, generateSpeech, chatWithAI, getAIIdeas } from "@/actions/ai"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface Props {
  params: Promise<{ id: string }>
  initialData: {
    event: any
    aiIdeas: any[]
  }
  searchParams: Promise<{ action?: string }>
}

const aiActions = [
  { id: "theme", title: "Generate Theme", description: "AI-powered theme & color palette", icon: Sparkles, action: generateTheme },
  { id: "palette", title: "Color Palette", description: "Sophisticated 5-color palette", icon: Palette, action: generateColorPalette },
  { id: "vendors", title: "Vendor Finder", description: "Vendor suggestions & questions", icon: Truck, action: generateVendorSuggestions },
  { id: "timeline", title: "Timeline Gen", description: "Week-by-week milestones", icon: Calendar, action: generateTimeline },
  { id: "budget", title: "Smart Budget", description: "Auto budget breakdown", icon: DollarSign, action: generateBudgetBreakdown },
  { id: "activities", title: "Activity Ideas", description: "Unique entertainment ideas", icon: ClipboardList, action: generateActivityIdeas },
  { id: "checklist", title: "Checklist", description: "Comprehensive planning checklist", icon: ClipboardList, action: generateChecklist },
]

export function AIAssistantClient({ params, initialData, searchParams }: Props) {
  const { id } = params
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("chat")
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [generatingType, setGeneratingType] = useState<string | null>(null)
  const [speechForm, setSpeechForm] = useState({ role: "", relationship: "", tone: "mixed", memories: "" })

  useEffect(() => {
    searchParams.then(params => {
      if (params.action && aiActions.find(a => a.id === params.action)) {
        setActiveTab("generate")
        setTimeout(() => handleGenerate(aiActions.find(a => a.id === params.action)!), 100)
      }
    })
  }, [])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    const userMessage = input
    setMessages(prev => [...prev, { role: "user", content: userMessage, timestamp: new Date() }])
    setInput("")
    setIsLoading(true)
    
    try {
      const response = await chatWithAI(id, userMessage, messages.map(m => ({ role: m.role, content: m.content })))
      setMessages(prev => [...prev, { role: "assistant", content: response, timestamp: new Date() }])
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again.", timestamp: new Date() }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerate = async (action: typeof aiActions[0]) => {
    setGeneratingType(action.id)
    try {
      const result = await action.action(id)
      setGeneratedContent({ type: action.id, data: result })
      toast({ title: `${action.title} generated!` })
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setGeneratingType(null)
    }
  }

  const handleGenerateSpeech = async () => {
    if (!speechForm.role || !speechForm.relationship || !speechForm.memories) {
      return toast({ title: "Please fill all fields", variant: "destructive" })
    }
    setGeneratingType("speech")
    try {
      const result = await generateSpeech(id, speechForm.role, speechForm.relationship, speechForm.tone, speechForm.memories)
      setGeneratedContent({ type: "speech", data: result })
      toast({ title: "Speech generated!" })
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setGeneratingType(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied to clipboard" })
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            AI Planning Assistant
          </h1>
          <p className="text-muted-foreground">Get personalized ideas, generate content, and chat about your event</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chat">Chat Assistant</TabsTrigger>
          <TabsTrigger value="generate">Generate Ideas</TabsTrigger>
          <TabsTrigger value="speech">Speech Writer</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-4">
          <Card className="flex flex-col h-[calc(100vh-350px)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat with AI Planner
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Hi! I'm your AI event planner.</p>
                    <p className="text-sm mt-1">Ask me anything about your {initialData.event?.event_type || "event"}!</p>
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      {["What's a good theme?", "Budget tips for 100 guests?", "Unique entertainment ideas?", "Vendor questions to ask"].map(q => (
                        <Button key={q} variant="outline" size="sm" onClick={() => setInput(q)}>{q}</Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={cn("flex gap-3", msg.role === "user" && "justify-end")}>
                      <div className={cn("max-w-[70%] rounded-2xl px-4 py-2", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={cn("text-xs mt-1 opacity-70", msg.role === "user" ? "text-right" : "")}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
              <form onSubmit={handleSendMessage} className="flex gap-2 mt-4 border-t pt-4">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your event..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate Tab */}
        <TabsContent value="generate" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {aiActions.map(action => (
              <ActionCard
                key={action.id}
                action={action}
                isGenerating={generatingType === action.id}
                onClick={handleGenerate}
              />
            ))}
          </div>

          {/* Generated Content Display */}
          {generatedContent && (
            <Card className="mt-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Generated: {aiActions.find(a => a.id === generatedContent.type)?.title}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setGeneratedContent(null)}>×</Button>
              </CardHeader>
              <CardContent>
                <GeneratedContentDisplay content={generatedContent} onCopy={copyToClipboard} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Speech Tab */}
        <TabsContent value="speech" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Speech & Toast Writer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Generate personalized speeches for any role</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Your Role" value={speechForm.role} onChange={(v) => setSpeechForm({...speechForm, role: v})} placeholder="Father of bride, best man, etc." />
                  <FormField label="Relationship" value={speechForm.relationship} onChange={(v) => setSpeechForm({...speechForm, relationship: v})} placeholder="Father, brother, friend, etc." />
                </div>
                <FormField label="Tone" value={speechForm.tone} onChange={(v) => setSpeechForm({...speechForm, tone: v})} type="select" options={["funny", "sentimental", "inspirational", "mixed"]} />
                <FormField label="Key Memories/Stories" value={speechForm.memories} onChange={(v) => setSpeechForm({...speechForm, memories: v})} type="textarea" placeholder="Share key memories, stories, or messages to include..." rows={4} />
                <Button onClick={handleGenerateSpeech} disabled={generatingType === "speech" || !speechForm.role || !speechForm.relationship || !speechForm.memories} className="w-full">
                  {generatingType === "speech" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  <Zap className="mr-2 h-4 w-4" />
                  Generate Speech
                </Button>
              </CardContent>
            </Card>

            {generatedContent?.type === "speech" && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Speeches</CardTitle>
                </CardHeader>
                <CardContent>
                  <GeneratedContentDisplay content={generatedContent} onCopy={copyToClipboard} />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                AI Generation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {initialData.aiIdeas.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No AI generations yet</p>
              ) : (
                <div className="space-y-3">
                  {initialData.aiIdeas.map((idea: any) => (
                    <div key={idea.id} className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium capitalize">{idea.idea_type.replace('_', ' ')}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(idea.created_at)}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setGeneratedContent({ type: idea.idea_type, data: idea.content })}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ActionCard({ action, isGenerating, onClick }: { action: typeof aiActions[0]; isGenerating: boolean; onClick: (a: typeof aiActions[0]) => void }) {
  return (
    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer" onClick={() => !isGenerating && onClick(action)}>
      <CardContent className="p-6 flex flex-col h-full">
        <div className="p-3 rounded-xl bg-primary/10 text-primary mb-4">
          <action.icon className="h-6 w-6" />
        </div>
        <h3 className="font-semibold mb-1">{action.title}</h3>
        <p className="text-sm text-muted-foreground mb-4 flex-1">{action.description}</p>
        <Button 
          className="w-full" 
          disabled={isGenerating}
          variant={isGenerating ? "secondary" : "outline"}
        >
          {isGenerating ? (
            <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating... </> 
          ) : (
            <> <Zap className="mr-2 h-4 w-4" /> Generate </> 
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function FormField({ label, value, onChange, placeholder, type = "input", options, rows }: any) {
  if (type === "select") {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-background">
          {options.map((o: string) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
        </select>
      </div>
    )
  }
  if (type === "textarea") {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full px-3 py-2 border rounded-md bg-background" />
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border rounded-md bg-background" />
    </div>
  )
}

function GeneratedContentDisplay({ content, onCopy }: { content: any; onCopy: (text: string) => void }) {
  const { type, data } = content

  if (type === "theme" && data) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold">{data.theme_name}</h3>
          <p className="text-muted-foreground">{data.description}</p>
          <p className="text-sm mt-2"><strong>Decor Style:</strong> {data.decor_style}</p>
        </div>
        <div>
          <h4 className="font-medium mb-2">Color Palette</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(data.color_palette || {}).map(([role, hex]) => (
              <div key={role} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded border" style={{ backgroundColor: hex }} />
                <div>
                  <p className="font-medium capitalize">{role}</p>
                  <p className="text-sm text-muted-foreground font-mono">{hex}</p>
                  <Button variant="ghost" size="icon" onClick={() => onCopy(hex as string)}>Copy</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium mb-2">Mood Board Keywords</h4>
          <div className="flex flex-wrap gap-2">
            {data.mood_board_keywords?.map((k: string) => (
              <Badge key={k} variant="outline">{k}</Badge>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === "palette" && data?.palette) {
    return (
      <div className="space-y-3">
        {data.palette.map((color: any) => (
          <div key={color.role} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <div className="w-12 h-12 rounded border" style={{ backgroundColor: color.hex }} />
            <div className="flex-1">
              <p className="font-medium capitalize">{color.role}: {color.name}</p>
              <p className="text-sm text-muted-foreground">{color.usage}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onCopy(color.hex)}>Copy</Button>
          </div>
        ))}
      </div>
    )
  }

  if (type === "vendors" && data?.vendors) {
    return (
      <div className="space-y-4">
        {data.vendors.map((v: any, i: number) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{v.category}</h4>
                <Badge variant="secondary">{v.priority}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">Budget: ~{v.budget_percentage}%</p>
              <div className="grid gap-2 sm:grid-cols-3 text-sm">
                <div>
                  <p className="font-medium">Search Queries</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {v.search_queries?.map((q: string) => <li key={q}>{q}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Questions to Ask</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {v.questions_to_ask?.map((q: string) => <li key={q}>{q}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Red Flags</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {v.red_flags?.map((r: string) => <li key={r}>{r}</li>)}
                  </ul>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2"><strong>Tips:</strong> {v.tips?.join(", ")}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (type === "timeline" && data?.milestones) {
    return (
      <div className="space-y-3">
        {data.milestones.map((m: any, i: number) => (
          <div key={i} className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{m.category}</Badge>
              <Badge className={m.priority === 1 ? "bg-red-100 text-red-800" : m.priority === 2 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}>
                Priority {m.priority}
              </Badge>
            </div>
            <h4 className="font-medium mt-2">{m.title}</h4>
            {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
            <p className="text-sm text-muted-foreground mt-1">Due: {formatDate(m.due_date)}</p>
          </div>
        ))}
      </div>
    )
  }

  if (type === "budget_breakdown" && data?.categories) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Contingency: {data.contingency_percentage}%</p>
        {data.categories.map((c: any, i: number) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{c.name}</h4>
                <span className="font-bold">{formatCurrency(c.amount)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{c.percentage}% of budget</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                {c.items?.map((item: string) => <li key={item}>{item}</li>)}
              </ul>
              <p className="text-sm text-muted-foreground mt-2"><strong>Tips:</strong> {c.tips?.join(", ")}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (type === "activities" && data?.activities) {
    return (
      <div className="space-y-3">
        {data.activities.map((a: any, i: number) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold">{a.title}</h4>
                  <p className="text-sm text-muted-foreground">{a.description}</p>
                </div>
                <Badge variant="secondary">{a.category}</Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-4 mt-3 text-sm">
                <span><strong>Duration:</strong> {a.duration_minutes} min</span>
                <span><strong>Complexity:</strong> {a.setup_complexity}</span>
                <span><strong>Appeal:</strong> {a.guest_appeal}</span>
                <span><strong>Est. Cost:</strong> {formatCurrency(a.estimated_cost)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2"><strong>Materials:</strong> {a.materials_needed?.join(", ")}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (type === "checklist" && data?.checklist) {
    return (
      <div className="space-y-4">
        {data.checklist.map((phase: any, i: number) => (
          <div key={i} className="space-y-2">
            <h4 className="font-semibold text-lg border-b pb-2">{phase.phase}</h4>
            <div className="space-y-2">
              {phase.items?.map((item: any, j: number) => (
                <div key={j} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <input type="checkbox" className="w-4 h-4" />
                  <div className="flex-1">
                    <p className="font-medium">{item.task}</p>
                    <p className="text-sm text-muted-foreground">{item.category} • Priority {item.priority}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === "speech" && data?.drafts) {
    return (
      <div className="space-y-6">
        {data.drafts.map((draft: any, i: number) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{draft.title} ({draft.estimated_duration_minutes} min)</span>
                <Button variant="ghost" size="icon" onClick={() => onCopy(draft.full_text)}>Copy</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none whitespace-pre-wrap">{draft.full_text}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(data, null, 2)}</pre>
}
