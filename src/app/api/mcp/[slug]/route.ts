import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { searchKnowledgeBase } from '@/lib/rag'

// MCP Protocol Implementation
// This endpoint allows AI assistants to query knowledge bases via the Model Context Protocol

interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

// Server info for MCP initialization
const SERVER_INFO = {
  name: 'sharedog-knowledge-base',
  version: '1.0.0',
  protocolVersion: '2024-11-05',
}

// Tool definitions
const TOOLS = [
  {
    name: 'search',
    description: 'Search the knowledge base for relevant information. Returns the most relevant chunks of content based on semantic similarity.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant information',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5, max: 20)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_sources',
    description: 'List all sources (files and URLs) that have been added to this knowledge base.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_info',
    description: 'Get information about this knowledge base including name, description, and statistics.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

async function getKnowledgeBase(slug: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('knowledge_bases')
    .select(`
      *,
      profiles!knowledge_bases_user_id_fkey(creator_slug)
    `)
    .eq('slug', slug)
    .eq('mcp_enabled', true)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

async function handleInitialize(kb: { name: string; description: string | null }) {
  return {
    ...SERVER_INFO,
    capabilities: {
      tools: {},
    },
    instructions: `This is the "${kb.name}" knowledge base. ${kb.description || 'Search for information using the available tools.'}`,
  }
}

async function handleListTools() {
  return {
    tools: TOOLS,
  }
}

async function handleCallTool(
  toolName: string,
  args: Record<string, unknown>,
  kbId: string,
  kb: { name: string; description: string | null }
) {
  const supabase = createServiceClient()

  switch (toolName) {
    case 'search': {
      const query = args.query as string
      const limit = Math.min(args.limit as number || 5, 20)

      const results = await searchKnowledgeBase(kbId, query, limit, { useServiceClient: true })

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No relevant information found for your query.',
            },
          ],
        }
      }

      const formattedResults = results
        .map(
          (r, i) =>
            `[${i + 1}] (${(r.similarity * 100).toFixed(1)}% match, from: ${r.sourceName})\n${r.content}`
        )
        .join('\n\n---\n\n')

      return {
        content: [
          {
            type: 'text',
            text: formattedResults,
          },
        ],
      }
    }

    case 'list_sources': {
      const { data: sources } = await supabase
        .from('sources')
        .select('id, name, type, status, created_at')
        .eq('knowledge_base_id', kbId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (!sources || sources.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No sources have been added to this knowledge base yet.',
            },
          ],
        }
      }

      const sourceList = sources
        .map((s) => `- ${s.name} (${s.type})`)
        .join('\n')

      return {
        content: [
          {
            type: 'text',
            text: `Sources in this knowledge base:\n\n${sourceList}`,
          },
        ],
      }
    }

    case 'get_info': {
      const { data: stats } = await supabase
        .from('sources')
        .select('id, status')
        .eq('knowledge_base_id', kbId)

      const { count: chunkCount } = await supabase
        .from('chunks')
        .select('*', { count: 'exact', head: true })
        .eq('knowledge_base_id', kbId)

      const completedSources = stats?.filter((s) => s.status === 'completed').length || 0
      const totalSources = stats?.length || 0

      return {
        content: [
          {
            type: 'text',
            text: `Knowledge Base: ${kb.name}\n\nDescription: ${kb.description || 'No description provided.'}\n\nStatistics:\n- Sources: ${completedSources} processed (${totalSources} total)\n- Chunks: ${chunkCount || 0} indexed`,
          },
        ],
      }
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

function createError(id: string | number, code: number, message: string): MCPResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message },
  }
}

function createResult(id: string | number, result: unknown): MCPResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Get the knowledge base
  const kb = await getKnowledgeBase(slug)

  if (!kb) {
    return NextResponse.json(
      { error: 'Knowledge base not found or MCP not enabled' },
      { status: 404 }
    )
  }

  // Check visibility - for now, only public KBs are accessible via MCP
  // TODO: Add API key authentication for private KBs
  if (kb.visibility !== 'public') {
    return NextResponse.json(
      { error: 'This knowledge base is not publicly accessible' },
      { status: 403 }
    )
  }

  try {
    const body: MCPRequest = await request.json()

    // Validate JSON-RPC format
    if (body.jsonrpc !== '2.0' || !body.method || body.id === undefined) {
      return NextResponse.json(
        createError(body.id || 0, -32600, 'Invalid Request'),
        { status: 400 }
      )
    }

    let result: unknown

    switch (body.method) {
      case 'initialize':
        result = await handleInitialize(kb)
        break

      case 'tools/list':
        result = await handleListTools()
        break

      case 'tools/call':
        const toolParams = body.params as { name: string; arguments?: Record<string, unknown> }
        if (!toolParams?.name) {
          return NextResponse.json(
            createError(body.id, -32602, 'Invalid params: tool name required'),
            { status: 400 }
          )
        }
        result = await handleCallTool(
          toolParams.name,
          toolParams.arguments || {},
          kb.id,
          kb
        )
        break

      case 'ping':
        result = {}
        break

      default:
        return NextResponse.json(
          createError(body.id, -32601, `Method not found: ${body.method}`),
          { status: 400 }
        )
    }

    return NextResponse.json(createResult(body.id, result))
  } catch (error) {
    console.error('MCP error:', error)
    return NextResponse.json(
      createError(0, -32603, 'Internal error'),
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET endpoint for MCP discovery/info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const kb = await getKnowledgeBase(slug)

  if (!kb) {
    return NextResponse.json(
      { error: 'Knowledge base not found or MCP not enabled' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    protocolVersion: SERVER_INFO.protocolVersion,
    knowledgeBase: {
      name: kb.name,
      description: kb.description,
      slug: kb.slug,
    },
    endpoint: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/mcp/${slug}`,
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
  })
}
