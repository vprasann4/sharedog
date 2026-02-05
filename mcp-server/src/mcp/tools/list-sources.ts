import type { Env, KnowledgeBase } from '../../types'
import { createSupabaseClient, listSources } from '../../db/supabase'

/**
 * List sources tool definition for MCP
 */
export const listSourcesToolDefinition = {
  name: 'list_sources',
  description: 'List all data sources in the knowledge base. Shows files and URLs that have been indexed.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
}

/**
 * Execute list sources tool
 */
export async function executeListSources(
  kb: KnowledgeBase,
  env: Env
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    const supabase = createSupabaseClient(env)
    const sources = await listSources(supabase, kb.id)

    if (sources.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No sources found in knowledge base "${kb.name}". The knowledge base appears to be empty.`,
          },
        ],
      }
    }

    // Group sources by type
    const files = sources.filter(s => s.type === 'file')
    const urls = sources.filter(s => s.type === 'url')

    const sections: string[] = [
      `# Sources in "${kb.name}"`,
      '',
      `Total: ${sources.length} source${sources.length !== 1 ? 's' : ''}`,
      '',
    ]

    if (files.length > 0) {
      sections.push('## Files')
      sections.push('')
      files.forEach(file => {
        const size = file.file_size
          ? `(${formatFileSize(file.file_size)})`
          : ''
        const type = file.mime_type
          ? `[${file.mime_type.split('/')[1]?.toUpperCase() || file.mime_type}]`
          : ''
        sections.push(`- **${file.name}** ${type} ${size}`)
      })
      sections.push('')
    }

    if (urls.length > 0) {
      sections.push('## URLs')
      sections.push('')
      urls.forEach(url => {
        sections.push(`- **${url.name}**: ${url.url}`)
      })
      sections.push('')
    }

    return {
      content: [
        {
          type: 'text',
          text: sections.join('\n'),
        },
      ],
    }
  } catch (error) {
    console.error('List sources error:', error)
    return {
      content: [
        {
          type: 'text',
          text: `Error listing sources: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    }
  }
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}
