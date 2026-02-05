/**
 * Cloudflare Worker Environment bindings
 */
export interface Env {
  // Environment variables
  ENVIRONMENT: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  OPENAI_API_KEY: string

  // KV Namespace for rate limiting
  RATE_LIMITS: KVNamespace
}

/**
 * Knowledge base data from Supabase
 */
export interface KnowledgeBase {
  id: string
  user_id: string
  name: string
  description: string | null
  slug: string
  visibility: 'private' | 'public'
  pricing_model: 'free' | 'paid'
  price_cents: number
  mcp_enabled: boolean
  created_at: string
  updated_at: string
}

/**
 * OAuth token validation result
 */
export interface TokenValidationResult {
  valid: boolean
  kb?: KnowledgeBase
  userId?: string
  clientId?: string
  scopes?: string[]
  error?: string
}

/**
 * Source data from knowledge base
 */
export interface Source {
  id: string
  knowledge_base_id: string
  type: 'file' | 'url'
  name: string
  url: string | null
  file_path: string | null
  file_size: number | null
  mime_type: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

/**
 * Search result from vector similarity search
 */
export interface SearchResult {
  content: string
  source_name: string
  source_type: string
  similarity: number
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
}

/**
 * MCP Request logging data
 */
export interface MCPRequestLog {
  knowledge_base_id: string
  client_id: string | null
  method: string
  query: string | null
  duration_ms: number | null
  status_code: number | null
  error_message: string | null
  ip_address: string | null
  user_agent: string | null
}
