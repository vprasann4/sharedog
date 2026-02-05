import type { KnowledgeBase } from '../../types'

/**
 * Get info tool definition for MCP
 */
export const getInfoToolDefinition = {
  name: 'get_info',
  description: 'Get information about the knowledge base, including its name, description, and settings.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
}

/**
 * Execute get info tool
 */
export async function executeGetInfo(
  kb: KnowledgeBase
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const sections: string[] = [
    `# ${kb.name}`,
    '',
  ]

  if (kb.description) {
    sections.push(kb.description)
    sections.push('')
  }

  sections.push('## Details')
  sections.push('')
  sections.push(`- **Visibility:** ${kb.visibility === 'public' ? 'Public' : 'Private'}`)
  sections.push(`- **Pricing:** ${kb.pricing_model === 'free' ? 'Free' : `$${(kb.price_cents / 100).toFixed(2)}`}`)
  sections.push(`- **MCP Enabled:** Yes`)
  sections.push(`- **Created:** ${new Date(kb.created_at).toLocaleDateString()}`)
  sections.push(`- **Last Updated:** ${new Date(kb.updated_at).toLocaleDateString()}`)
  sections.push('')
  sections.push('## Available Tools')
  sections.push('')
  sections.push('- **search**: Search the knowledge base for relevant information')
  sections.push('- **list_sources**: View all indexed sources (files and URLs)')
  sections.push('- **get_info**: View this information about the knowledge base')

  return {
    content: [
      {
        type: 'text',
        text: sections.join('\n'),
      },
    ],
  }
}
