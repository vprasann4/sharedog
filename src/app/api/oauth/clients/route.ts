import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  generateClientId,
  generateClientSecret,
  hashToken,
  DEFAULT_SCOPES,
  oauthError,
  OAUTH_ERRORS,
} from '@/lib/oauth'

/**
 * OAuth Client Registration Endpoint
 *
 * POST /api/oauth/clients
 *
 * Creates a new OAuth client for a knowledge base
 * Requires authentication (user must own the KB)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized', error_description: 'Authentication required' },
      { status: 401 }
    )
  }

  const body = await request.json()
  const { knowledge_base_id, name, redirect_uris, scopes } = body

  // Validate required fields
  if (!knowledge_base_id) {
    return oauthError(OAUTH_ERRORS.INVALID_REQUEST, 'knowledge_base_id is required')
  }

  if (!name) {
    return oauthError(OAUTH_ERRORS.INVALID_REQUEST, 'name is required')
  }

  // Verify user owns the knowledge base
  const { data: kb, error: kbError } = await supabase
    .from('knowledge_bases')
    .select('id, name, slug')
    .eq('id', knowledge_base_id)
    .eq('user_id', user.id)
    .single()

  if (kbError || !kb) {
    return oauthError(OAUTH_ERRORS.ACCESS_DENIED, 'Knowledge base not found or access denied')
  }

  // Generate client credentials
  const clientId = generateClientId()
  const clientSecret = generateClientSecret()
  const clientSecretHash = hashToken(clientSecret)

  // Validate and set scopes
  const validScopes = scopes?.filter((s: string) => DEFAULT_SCOPES.includes(s as typeof DEFAULT_SCOPES[number])) || DEFAULT_SCOPES

  // Validate redirect URIs
  const validRedirectUris = Array.isArray(redirect_uris)
    ? redirect_uris.filter((uri: string) => {
        try {
          new URL(uri)
          return true
        } catch {
          return false
        }
      })
    : []

  // Create the client using service client to bypass RLS for insert
  const serviceClient = createServiceClient()
  const { data: client, error: insertError } = await serviceClient
    .from('oauth_clients')
    .insert({
      client_id: clientId,
      client_secret_hash: clientSecretHash,
      knowledge_base_id: kb.id,
      user_id: user.id,
      name,
      redirect_uris: validRedirectUris,
      scopes: validScopes,
    })
    .select('id, client_id, name, redirect_uris, scopes, created_at')
    .single()

  if (insertError) {
    console.error('Error creating OAuth client:', insertError)
    return oauthError(OAUTH_ERRORS.SERVER_ERROR, 'Failed to create client')
  }

  // Return client info with secret (only shown once!)
  return NextResponse.json({
    client_id: clientId,
    client_secret: clientSecret, // Only returned on creation!
    client_id_issued_at: Math.floor(Date.now() / 1000),
    name: client.name,
    redirect_uris: client.redirect_uris,
    scopes: client.scopes,
    knowledge_base: {
      id: kb.id,
      name: kb.name,
      slug: kb.slug,
    },
    // MCP configuration hint
    mcp_config: {
      url: `${process.env.NEXT_PUBLIC_MCP_URL || 'https://mcp.sharedog.app'}/mcp/${kb.slug}`,
      note: 'Use the access token from the OAuth flow as the Bearer token',
    },
  }, { status: 201 })
}

/**
 * GET /api/oauth/clients
 *
 * List OAuth clients for the authenticated user
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized', error_description: 'Authentication required' },
      { status: 401 }
    )
  }

  // Get query params for optional filtering
  const searchParams = request.nextUrl.searchParams
  const knowledgeBaseId = searchParams.get('knowledge_base_id')

  // Build query
  let query = supabase
    .from('oauth_clients')
    .select(`
      id,
      client_id,
      name,
      redirect_uris,
      scopes,
      created_at,
      revoked_at,
      knowledge_bases (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (knowledgeBaseId) {
    query = query.eq('knowledge_base_id', knowledgeBaseId)
  }

  const { data: clients, error } = await query

  if (error) {
    console.error('Error fetching clients:', error)
    return oauthError(OAUTH_ERRORS.SERVER_ERROR, 'Failed to fetch clients')
  }

  return NextResponse.json({
    clients: clients.map(c => ({
      id: c.id,
      client_id: c.client_id,
      name: c.name,
      redirect_uris: c.redirect_uris,
      scopes: c.scopes,
      created_at: c.created_at,
      revoked: c.revoked_at !== null,
      knowledge_base: c.knowledge_bases,
    })),
  })
}

/**
 * DELETE /api/oauth/clients/:client_id
 *
 * Revoke (soft delete) an OAuth client
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized', error_description: 'Authentication required' },
      { status: 401 }
    )
  }

  const body = await request.json()
  const { client_id } = body

  if (!client_id) {
    return oauthError(OAUTH_ERRORS.INVALID_REQUEST, 'client_id is required')
  }

  // Soft delete (revoke) the client
  const { error } = await supabase
    .from('oauth_clients')
    .update({ revoked_at: new Date().toISOString() })
    .eq('client_id', client_id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error revoking client:', error)
    return oauthError(OAUTH_ERRORS.SERVER_ERROR, 'Failed to revoke client')
  }

  // Also delete all tokens for this client
  const serviceClient = createServiceClient()
  await serviceClient
    .from('oauth_tokens')
    .delete()
    .eq('client_id', client_id)

  return new NextResponse(null, { status: 204 })
}
