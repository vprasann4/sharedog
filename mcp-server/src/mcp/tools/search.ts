import type { Env, KnowledgeBase } from '../../types'
import { createSupabaseClient, searchChunks } from '../../db/supabase'
import { generateEmbedding } from '../../utils/embeddings'

/**
 * Search tool definition for MCP
 */
export const searchToolDefinition = {
  name: 'search',
  description: 'Search the knowledge base for relevant information using semantic similarity. Returns the most relevant chunks of content matching your query.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'The search query - describe what information you are looking for',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5, max: 10)',
        minimum: 1,
        maximum: 10,
      },
    },
    required: ['query'],
  },
}

/**
 * Execute search tool
 */
export async function executeSearch(
  kb: KnowledgeBase,
  args: { query: string; limit?: number },
  env: Env
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { query, limit = 5 } = args

  // Validate limit
  const safeLimit = Math.min(Math.max(1, limit), 10)

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query, env)

    // Search for similar chunks
    const supabase = createSupabaseClient(env)
    const results = await searchChunks(supabase, kb.id, queryEmbedding, safeLimit)

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No results found for query: "${query}" in knowledge base "${kb.name}"`,
          },
        ],
      }
    }

    // Format results
    const formattedResults = results.map((result, index) => {
      return [
        `## Result ${index + 1} (similarity: ${(result.similarity * 100).toFixed(1)}%)`,
        `**Source:** ${result.source_name} (${result.source_type})`,
        '',
        result.content,
        '',
        '---',
      ].join('\n')
    })

    return {
      content: [
        {
          type: 'text',
          text: [
            `# Search Results for "${query}"`,
            `Found ${results.length} relevant result${results.length !== 1 ? 's' : ''} in **${kb.name}**`,
            '',
            ...formattedResults,
          ].join('\n'),
        },
      ],
    }
  } catch (error) {
    console.error('Search error:', error)
    return {
      content: [
        {
          type: 'text',
          text: `Error performing search: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    }
  }
}
