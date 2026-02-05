import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Env, KnowledgeBase, Source, SearchResult, MCPRequestLog } from '../types'

/**
 * Create a Supabase client for Cloudflare Workers
 * Uses service role key for full database access
 */
export function createSupabaseClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Validate an OAuth access token and return the associated knowledge base
 * For paid KBs, also validates that the user has an active subscription
 */
export async function validateAccessToken(
  supabase: SupabaseClient,
  tokenHash: string
): Promise<{
  valid: boolean
  kb?: KnowledgeBase
  userId?: string
  clientId?: string
  scopes?: string[]
  subscriptionId?: string
  error?: string
}> {
  // Look up the token with KB info
  const { data: token, error: tokenError } = await supabase
    .from('oauth_tokens')
    .select(`
      *,
      knowledge_bases(*)
    `)
    .eq('access_token_hash', tokenHash)
    .single()

  if (tokenError || !token) {
    return { valid: false, error: 'Invalid access token' }
  }

  // Check if token is expired
  if (new Date(token.expires_at) < new Date()) {
    return { valid: false, error: 'Access token expired' }
  }

  const kb = token.knowledge_bases as KnowledgeBase

  // For paid KBs, validate subscription
  if (kb.pricing_model === 'paid') {
    // Owner always has access (check if token user is KB owner)
    if (token.user_id === kb.user_id) {
      // Owner, proceed
    } else if (token.subscription_id) {
      // Check subscription status from separate query
      const { data: subscription } = await supabase
        .from('kb_subscriptions')
        .select('id, status, current_period_end')
        .eq('id', token.subscription_id)
        .single()

      if (!subscription) {
        return { valid: false, error: 'Subscription required for this knowledge base' }
      }

      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        return { valid: false, error: 'Subscription is not active' }
      }

      // Check if subscription has expired
      if (subscription.current_period_end && new Date(subscription.current_period_end) < new Date()) {
        return { valid: false, error: 'Subscription has expired' }
      }
    } else {
      return { valid: false, error: 'Subscription required for this knowledge base' }
    }
  }

  // Update last_used_at
  await supabase
    .from('oauth_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', token.id)

  return {
    valid: true,
    kb,
    userId: token.user_id,
    clientId: token.client_id,
    scopes: token.scopes,
    subscriptionId: token.subscription_id,
  }
}

/**
 * Get knowledge base by slug
 */
export async function getKnowledgeBaseBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<KnowledgeBase | null> {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('*')
    .eq('slug', slug)
    .eq('mcp_enabled', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as KnowledgeBase
}

/**
 * List sources for a knowledge base
 */
export async function listSources(
  supabase: SupabaseClient,
  knowledgeBaseId: string
): Promise<Source[]> {
  const { data, error } = await supabase
    .from('sources')
    .select('id, knowledge_base_id, type, name, url, file_path, file_size, mime_type, status, created_at')
    .eq('knowledge_base_id', knowledgeBaseId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching sources:', error)
    return []
  }

  return data as Source[]
}

/**
 * Search chunks using vector similarity
 */
export async function searchChunks(
  supabase: SupabaseClient,
  knowledgeBaseId: string,
  queryEmbedding: number[],
  limit: number = 5
): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_knowledge_base_id: knowledgeBaseId,
    match_count: limit,
  })

  if (error) {
    console.error('Error searching chunks:', error)
    return []
  }

  return data as SearchResult[]
}

/**
 * Log an MCP request for analytics
 */
export async function logMCPRequest(
  supabase: SupabaseClient,
  log: MCPRequestLog
): Promise<void> {
  const { error } = await supabase.from('mcp_requests').insert(log)

  if (error) {
    console.error('Error logging MCP request:', error)
  }
}
