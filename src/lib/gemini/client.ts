const GEMINI_API_VERSION = "v1"

/**
 * Gemini models occasionally return 503 "high demand" on the free tier. We try
 * the newest model first, then fall back through slightly older Flash models so
 * one busy endpoint doesn't take the whole planner down.
 */
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash"
const FALLBACK_MODELS = (
  process.env.GEMINI_FALLBACK_MODELS ||
  "gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-3.5-flash"
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean)

const GEMINI_MODELS = Array.from(new Set([PRIMARY_MODEL, ...FALLBACK_MODELS]))

// Gemini's free tier can stall for a long time under load. Keep each model
// attempt short enough that a busy endpoint falls through to the next model
// quickly, while still giving long-form text (speeches) room to finish.
const JSON_MODEL_TIMEOUT_MS = 12_000
const TEXT_MODEL_TIMEOUT_MS = 25_000
const JSON_TOTAL_BUDGET_MS = 45_000
const TEXT_TOTAL_BUDGET_MS = 80_000

function getApiKey(): string {
  const key = process.env.GOOGLE_GEMINI_API_KEY
  if (!key) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not configured")
  }
  return key
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string; thought?: boolean }>
    }
    finishReason?: string
  }>
  error?: { message?: string; status?: string }
}

class GeminiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "GeminiError"
    this.status = status
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callModel(
  model: string,
  prompt: string,
  options: { json?: boolean; maxOutputTokens?: number; temperature?: number },
  timeoutMs: number
): Promise<string> {
  const { json = false, maxOutputTokens = 8192, temperature = 0.7 } = options

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  // Thinking tokens add latency without improving short JSON plans. The lite
  // fallbacks reject thinkingBudget, so only send it for full Flash models.
  const supportsThinkingBudget = !model.includes("flash-lite") && !model.startsWith("gemini-2")

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": getApiKey(),
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens,
            ...(json ? { responseMimeType: "application/json" } : {}),
            ...(supportsThinkingBudget ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        }),
        signal: controller.signal,
        cache: "no-store",
      }
    )

    const data = (await response.json().catch(() => ({}))) as GeminiResponse

    if (!response.ok) {
      throw new GeminiError(
        data.error?.message || `Gemini request failed (${response.status})`,
        response.status
      )
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.filter((part) => !part.thought)
      .map((part) => part.text || "")
      .join("")
      .trim()

    if (!text) {
      const reason = data.candidates?.[0]?.finishReason
      throw new GeminiError(
        reason === "MAX_TOKENS"
          ? "Gemini response was cut off. Please try again."
          : "Gemini returned an empty response",
        502
      )
    }

    return text
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new GeminiError("Gemini took too long to respond", 504)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function callGemini(
  prompt: string,
  options: { json?: boolean; maxOutputTokens?: number; temperature?: number } = {}
): Promise<string> {
  const startedAt = Date.now()
  const perModelTimeout = options.json ? JSON_MODEL_TIMEOUT_MS : TEXT_MODEL_TIMEOUT_MS
  const totalBudget = options.json ? JSON_TOTAL_BUDGET_MS : TEXT_TOTAL_BUDGET_MS
  let lastError: unknown
  let timedOut = false

  for (const model of GEMINI_MODELS) {
    if (Date.now() - startedAt >= totalBudget) {
      timedOut = true
      break
    }

    try {
      return await callModel(model, prompt, options, perModelTimeout)
    } catch (error) {
      lastError = error
      const status = error instanceof GeminiError ? error.status : 0

      // A bad request or missing key will fail on every model — don't waste time.
      if (status === 400 || status === 401 || status === 403) {
        throw error
      }

      // Retry rate limits once, but move to the next model immediately after a
      // timeout or high-demand response instead of burning another full timeout.
      if (status === 429 && Date.now() - startedAt + 2_000 < totalBudget) {
        await delay(700 + Math.floor(Math.random() * 500))
        try {
          return await callModel(model, prompt, options, perModelTimeout)
        } catch (retryError) {
          lastError = retryError
        }
      }

      if (status === 504) {
        timedOut = true
      }
    }
  }

  if (lastError instanceof GeminiError) {
    const friendly =
      lastError.status === 429
        ? "Gemini's free-tier rate limit was reached. Please wait a minute and try again."
        : lastError.status === 504 || timedOut
          ? "Gemini took too long to respond. Please try again."
          : "Gemini is experiencing high demand right now. Please try again in a moment."
    throw new GeminiError(friendly, lastError.status)
  }

  throw new Error("AI generation failed. Please try again.")
}

function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced ? fenced[1] : text).trim()

  try {
    return JSON.parse(candidate) as T
  } catch {
    // Some models surround JSON with prose. Grab the outermost JSON object/array.
    const start = candidate.search(/[[{]/)
    const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"))
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as T
      } catch {
        // fall through to the friendly error below
      }
    }
    throw new Error("The AI returned an unreadable response. Please try again.")
  }
}

export async function generateJSON<T>(prompt: string): Promise<T> {
  const text = await callGemini(prompt, { json: true })
  return extractJson<T>(text)
}

export async function generateText(prompt: string): Promise<string> {
  return callGemini(prompt)
}

export const geminiConfig = {
  model: PRIMARY_MODEL,
  models: GEMINI_MODELS,
  apiVersion: GEMINI_API_VERSION,
}
