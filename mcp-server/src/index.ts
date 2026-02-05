import type { Env } from './types'
import { validateToken, createAuthContext } from './auth/validate'
import { checkRateLimit, addRateLimitHeaders } from './utils/rate-limit'
import { handleMCPRequest, parseMCPRequest } from './mcp/server'
import { createSupabaseClient, logMCPRequest } from './db/supabase'

/**
 * Sharedog MCP Server
 *
 * A Cloudflare Worker that serves MCP (Model Context Protocol) requests
 * for Sharedog knowledge bases with OAuth 2.1 authentication.
 *
 * Supports both Streamable HTTP and SSE transports for maximum compatibility
 * with Claude Desktop, Claude Code, Cursor, VS Code, and other MCP clients.
 *
 * Routes:
 * - GET /mcp/{slug} - Server info and SSE endpoint
 * - POST /mcp/{slug} - MCP JSON-RPC endpoint
 * - GET /health - Health check endpoint
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS headers for browser-based MCP clients
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id',
      'Access-Control-Expose-Headers': 'Mcp-Session-Id',
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Health check endpoint
    if (path === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Parse MCP route: /mcp/{slug}
    const mcpMatch = path.match(/^\/mcp\/([a-z0-9-]+)$/)
    if (!mcpMatch) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const slug = mcpMatch[1]

    // Handle GET requests - return server info or SSE stream
    if (request.method === 'GET') {
      const accept = request.headers.get('Accept') || ''

      // SSE transport - client wants to establish event stream
      if (accept.includes('text/event-stream')) {
        // For SSE, we need to validate auth first
        const authHeader = request.headers.get('Authorization')
        const tokenResult = await validateToken(authHeader, slug, env)

        if (!tokenResult.valid) {
          return new Response(
            JSON.stringify({ error: tokenResult.error || 'Unauthorized' }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          )
        }

        // Return SSE stream with keep-alive
        const { readable, writable } = new TransformStream()
        const writer = writable.getWriter()
        const encoder = new TextEncoder()

        // Send initial connection event
        const sessionId = crypto.randomUUID()
        writer.write(encoder.encode(`event: open\ndata: {"sessionId":"${sessionId}"}\n\n`))

        // Keep connection alive with periodic pings
        const keepAlive = setInterval(async () => {
          try {
            await writer.write(encoder.encode(`: ping\n\n`))
          } catch {
            clearInterval(keepAlive)
          }
        }, 30000)

        // Clean up on close
        request.signal.addEventListener('abort', () => {
          clearInterval(keepAlive)
          writer.close()
        })

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Mcp-Session-Id': sessionId,
            ...corsHeaders,
          },
        })
      }

      // Regular GET - return server metadata
      return new Response(
        JSON.stringify({
          name: `sharedog-${slug}`,
          version: '1.0.0',
          protocol: 'mcp',
          transport: ['streamable-http', 'sse'],
          capabilities: {
            tools: true,
          },
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    // DELETE request - close session (for SSE cleanup)
    if (request.method === 'DELETE') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // Only POST requests for MCP JSON-RPC
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const startTime = Date.now()
    let method = 'unknown'
    let query: string | null = null
    let statusCode = 200

    try {
      // Validate OAuth token
      const authHeader = request.headers.get('Authorization')
      const tokenResult = await validateToken(authHeader, slug, env)

      if (!tokenResult.valid) {
        statusCode = 401
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: tokenResult.error || 'Unauthorized',
            },
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        )
      }

      const authContext = createAuthContext(tokenResult)
      if (!authContext) {
        statusCode = 500
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal error: invalid auth context',
            },
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        )
      }

      // Check rate limits
      const rateLimitInfo = await checkRateLimit(env, authContext.kb.id, authContext.clientId)
      if (!rateLimitInfo.allowed) {
        statusCode = 429
        const headers = new Headers({ 'Content-Type': 'application/json', ...corsHeaders })
        addRateLimitHeaders(headers, rateLimitInfo)
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Rate limit exceeded',
            },
          }),
          {
            status: 429,
            headers,
          }
        )
      }

      // Parse request body
      let body: unknown
      try {
        body = await request.json()
      } catch {
        statusCode = 400
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32700,
              message: 'Parse error: invalid JSON',
            },
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        )
      }

      // Parse MCP request
      const mcpRequest = parseMCPRequest(body)
      if (!mcpRequest) {
        statusCode = 400
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32600,
              message: 'Invalid request',
            },
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        )
      }

      method = mcpRequest.method

      // Extract query for logging (if it's a search)
      if (method === 'tools/call' && mcpRequest.params) {
        const params = mcpRequest.params as { name?: string; arguments?: { query?: string } }
        if (params.name === 'search' && params.arguments?.query) {
          query = params.arguments.query
        }
      }

      // Handle MCP request
      const mcpResponse = await handleMCPRequest(mcpRequest, authContext.kb, env)

      // Build response with rate limit headers
      const responseHeaders = new Headers({ 'Content-Type': 'application/json', ...corsHeaders })
      addRateLimitHeaders(responseHeaders, rateLimitInfo)

      return new Response(JSON.stringify(mcpResponse), {
        status: 200,
        headers: responseHeaders,
      })
    } catch (error) {
      console.error('MCP server error:', error)
      statusCode = 500
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    } finally {
      // Log request (fire and forget)
      const duration = Date.now() - startTime
      try {
        const tokenResult = await validateToken(
          request.headers.get('Authorization'),
          slug,
          env
        )
        if (tokenResult.valid && tokenResult.kb) {
          const supabase = createSupabaseClient(env)
          await logMCPRequest(supabase, {
            knowledge_base_id: tokenResult.kb.id,
            client_id: tokenResult.clientId || null,
            method,
            query,
            duration_ms: duration,
            status_code: statusCode,
            error_message: null,
            ip_address: request.headers.get('CF-Connecting-IP'),
            user_agent: request.headers.get('User-Agent'),
          })
        }
      } catch (logError) {
        console.error('Failed to log MCP request:', logError)
      }
    }
  },
}
