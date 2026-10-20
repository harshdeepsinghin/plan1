import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!)

export const geminiModel = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 4096,
  },
})

export async function generateJSON<T>(prompt: string): Promise<T> {
  try {
    const result = await geminiModel.generateContent(prompt)
    const text = result.response.text()
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : text
    
    return JSON.parse(jsonStr) as T
  } catch (error) {
    console.error('Gemini API Error:', error)
    throw new Error('Failed to generate AI response')
  }
}

export async function generateText(prompt: string): Promise<string> {
  try {
    const result = await geminiModel.generateContent(prompt)
    return result.response.text()
  } catch (error) {
    console.error('Gemini API Error:', error)
    throw new Error('Failed to generate AI response')
  }
}
