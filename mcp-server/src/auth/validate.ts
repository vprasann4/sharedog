import type { Env, TokenValidationResult, KnowledgeBase } from '../types'
import { createSupabaseClient, validateAccessToken, getKnowledgeBaseBySlug } from '../db/supabase'

/**
 * Hash a token using SHA-256 (matching the Next.js OAuth implementation)
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate the Authorization header and return KB info if valid
 */
export async function validateToken(
  authHeader: string | null,
  slug: string,
  env: Env
): Promise<TokenValidationResult> {
  // Check for Authorization header
  if (!authHeader) {
    return { valid: false, error: 'Missing Authorization header' }
  }

  // Parse Bearer token
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return { valid: false, error: 'Invalid Authorization header format' }
  }

  const token = parts[1]

  // Verify token prefix
  if (!token.startsWith('sha_kb_')) {
    return { valid: false, error: 'Invalid token format' }
  }

  // Create Supabase client
  const supabase = createSupabaseClient(env)

  // Get knowledge base by slug first
  const kb = await getKnowledgeBaseBySlug(supabase, slug)
  if (!kb) {
    return { valid: false, error: 'Knowledge base not found or MCP not enabled' }
  }

  // Hash the token for lookup
  const tokenHash = await hashToken(token)

  // Validate the access token
  const tokenResult = await validateAccessToken(supabase, tokenHash)

  if (!tokenResult.valid) {
    return tokenResult
  }

  // Verify the token is for this knowledge base
  if (tokenResult.kb?.id !== kb.id) {
    return { valid: false, error: 'Token not valid for this knowledge base' }
  }

  return {
    valid: true,
    kb: tokenResult.kb,
    userId: tokenResult.userId,
    clientId: tokenResult.clientId,
    scopes: tokenResult.scopes,
  }
}

/**
 * Check if the token has a required scope
 */
export function hasScope(scopes: string[] | undefined, requiredScope: string): boolean {
  if (!scopes) return false
  return scopes.includes(requiredScope)
}

/**
 * Middleware result type for chaining
 */
export interface AuthContext {
  kb: KnowledgeBase
  userId: string
  clientId: string
  scopes: string[]
}

/**
 * Create an auth context from a validated token result
 */
export function createAuthContext(result: TokenValidationResult): AuthContext | null {
  if (!result.valid || !result.kb || !result.userId || !result.clientId || !result.scopes) {
    return null
  }

  return {
    kb: result.kb,
    userId: result.userId,
    clientId: result.clientId,
    scopes: result.scopes,
  }
}
