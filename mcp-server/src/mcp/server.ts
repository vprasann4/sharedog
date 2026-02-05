import type { Env, KnowledgeBase } from '../types'
import {
  searchToolDefinition,
  executeSearch,
  listSourcesToolDefinition,
  executeListSources,
  getInfoToolDefinition,
  executeGetInfo,
} from './tools'

/**
 * MCP Protocol types
 */
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

/**
 * MCP Error codes (from JSON-RPC spec + MCP extensions)
 */
const MCP_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
}

/**
 * Handle an MCP request
 */
export async function handleMCPRequest(
  request: MCPRequest,
  kb: KnowledgeBase,
  env: Env
): Promise<MCPResponse> {
  const { id, method, params } = request

  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: `sharedog-${kb.slug}`,
              version: '1.0.0',
            },
          },
        }

      case 'notifications/initialized':
        // Client acknowledged initialization
        return {
          jsonrpc: '2.0',
          id,
          result: {},
        }

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              searchToolDefinition,
              listSourcesToolDefinition,
              getInfoToolDefinition,
            ],
          },
        }

      case 'tools/call':
        return await handleToolCall(id, params as { name: string; arguments?: Record<string, unknown> }, kb, env)

      case 'ping':
        return {
          jsonrpc: '2.0',
          id,
          result: {},
        }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: MCP_ERRORS.METHOD_NOT_FOUND,
            message: `Method not found: ${method}`,
          },
        }
    }
  } catch (error) {
    console.error('MCP request error:', error)
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: MCP_ERRORS.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Internal error',
      },
    }
  }
}

/**
 * Handle a tool call
 */
async function handleToolCall(
  id: string | number,
  params: { name: string; arguments?: Record<string, unknown> },
  kb: KnowledgeBase,
  env: Env
): Promise<MCPResponse> {
  const { name, arguments: args = {} } = params

  switch (name) {
    case 'search':
      if (!args.query || typeof args.query !== 'string') {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: MCP_ERRORS.INVALID_PARAMS,
            message: 'Missing required parameter: query',
          },
        }
      }
      const searchResult = await executeSearch(
        kb,
        { query: args.query, limit: args.limit as number | undefined },
        env
      )
      return {
        jsonrpc: '2.0',
        id,
        result: searchResult,
      }

    case 'list_sources':
      const sourcesResult = await executeListSources(kb, env)
      return {
        jsonrpc: '2.0',
        id,
        result: sourcesResult,
      }

    case 'get_info':
      const infoResult = await executeGetInfo(kb)
      return {
        jsonrpc: '2.0',
        id,
        result: infoResult,
      }

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: MCP_ERRORS.METHOD_NOT_FOUND,
          message: `Tool not found: ${name}`,
        },
      }
  }
}

/**
 * Parse and validate an MCP request body
 */
export function parseMCPRequest(body: unknown): MCPRequest | null {
  if (!body || typeof body !== 'object') {
    return null
  }

  const req = body as Record<string, unknown>

  if (req.jsonrpc !== '2.0') {
    return null
  }

  if (typeof req.method !== 'string') {
    return null
  }

  return {
    jsonrpc: '2.0',
    id: req.id as string | number,
    method: req.method,
    params: req.params as Record<string, unknown> | undefined,
  }
}
