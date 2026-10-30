import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { GeminiError, extractJson, generateJSON, generateText, geminiConfig } from './client'

function geminiResponse(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  }
}

function errorResponse(status: number, message = 'nope') {
  return {
    ok: false,
    status,
    json: async () => ({ error: { message } }),
  }
}

describe('extractJson', () => {
  it('parses plain JSON', () => {
    expect(extractJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 })
  })

  it('parses fenced JSON blocks', () => {
    expect(extractJson<{ a: number }>('```json\n{"a":2}\n```')).toEqual({ a: 2 })
  })

  it('extracts the outermost object from surrounding prose', () => {
    expect(extractJson<{ a: number }>('Here is the plan: {"a":3} Hope it helps.')).toEqual({
      a: 3,
    })
  })

  it('extracts arrays', () => {
    expect(extractJson<number[]>('Result: [1, 2, 3]')).toEqual([1, 2, 3])
  })

  it('throws a friendly error for unreadable output', () => {
    expect(() => extractJson('not json at all')).toThrow(/could not read/i)
  })
})

describe('generateJSON', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_GEMINI_API_KEY', 'test-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('validates the response with the supplied schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(geminiResponse('{"count":2}')))
    const schema = z.object({ count: z.number() })

    await expect(generateJSON('prompt', schema)).resolves.toEqual({ count: 2 })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('generateContent'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('returns parsed JSON when no schema is supplied', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(geminiResponse('{"count":2}')))
    await expect(generateJSON('prompt')).resolves.toEqual({ count: 2 })
  })

  it('rejects responses that fail the schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(geminiResponse('{"count":"two"}')))
    const schema = z.object({ count: z.number() })

    await expect(generateJSON('prompt', schema)).rejects.toMatchObject({
      name: 'GeminiError',
      status: 502,
    })
  })

  it('does not retry authentication failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(errorResponse(403, 'bad key'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(generateJSON('prompt', z.any())).rejects.toThrow('bad key')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to the next model after a server error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(503, 'busy'))
      .mockResolvedValueOnce(geminiResponse('{"ok":true}'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(generateJSON('prompt', z.object({ ok: z.boolean() }))).resolves.toEqual({
      ok: true,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toContain(geminiConfig.models[1])
  })
})

describe('generateText', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_GEMINI_API_KEY', 'test-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns plain text and forwards the token limit', async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse('Hello there'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(generateText('prompt', 321)).resolves.toBe('Hello there')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.generationConfig.maxOutputTokens).toBe(321)
    expect(body.contents[0].parts[0].text).toBe('prompt')
  })

  it('ignores thought parts when composing text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  { text: 'thinking', thought: true },
                  { text: 'answer' },
                ],
              },
            },
          ],
        }),
      })
    )

    await expect(generateText('prompt')).resolves.toBe('answer')
  })

  it('throws when the API key is missing', async () => {
    vi.stubEnv('GOOGLE_GEMINI_API_KEY', '')
    await expect(generateText('prompt')).rejects.toThrow(/GOOGLE_GEMINI_API_KEY/)
  })

  it('reports an empty response after trying every model', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    )

    await expect(generateText('prompt')).rejects.toBeInstanceOf(GeminiError)
  })
})
