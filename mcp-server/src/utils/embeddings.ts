import type { Env } from '../types'

/**
 * Generate embeddings using OpenAI API
 * Uses text-embedding-3-small model for efficiency
 */
export async function generateEmbedding(
  text: string,
  env: Env
): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json() as {
    data: Array<{ embedding: number[] }>
  }

  return data.data[0].embedding
}
