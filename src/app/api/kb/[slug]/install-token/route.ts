import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateToken, hashToken, TOKEN_PREFIXES, TOKEN_EXPIRY } from '@/lib/oauth'
import { hasKBAccess, createFreeSubscription } from '@/lib/subscriptions'
import { generateDeeplink, type ClientType } from '@/lib/deeplinks'

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const clientType = (body.clientType || 'generic') as ClientType

    // Get knowledge base
    const { data: kb, error: kbError } = await supabase
      .from('knowledge_bases')
      .select('id, name, slug, visibility, pricing_model, mcp_enabled, user_id')
      .eq('slug', slug)
      .eq('visibility', 'public')
      .single()

    if (kbError || !kb) {
      return NextResponse.json(
        { error: 'Knowledge base not found' },
        { status: 404 }
      )
    }

    if (!kb.mcp_enabled) {
      return NextResponse.json(
        { error: 'MCP is not enabled for this knowledge base' },
        { status: 400 }
      )
    }

    // Check access
    const accessResult = await hasKBAccess(supabase, kb.id, user.id)
    if (!accessResult.hasAccess) {
      return NextResponse.json(
        { error: 'Subscription required' },
        { status: 403 }
      )
    }

    // For free KBs, create a subscription record if it doesn't exist (for tracking)
    let subscriptionId: string | null = accessResult.subscription?.id || null
    if (kb.pricing_model === 'free' && !subscriptionId && kb.user_id !== user.id) {
      const sub = await createFreeSubscription(supabase, kb.id, user.id)
      subscriptionId = sub?.id || null
    }

    // Generate OAuth client and token
    const clientId = generateToken(TOKEN_PREFIXES.CLIENT_ID, 16)
    const clientSecret = generateToken(TOKEN_PREFIXES.CLIENT_SECRET, 32)
    const accessToken = generateToken(TOKEN_PREFIXES.ACCESS, 32)

    const clientSecretHash = hashToken(clientSecret)
    const accessTokenHash = hashToken(accessToken)

    // Calculate expiry (30 days for subscriber tokens)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Create OAuth client
    const { error: clientError } = await supabase.from('oauth_clients').insert({
      client_id: clientId,
      client_secret_hash: clientSecretHash,
      knowledge_base_id: kb.id,
      user_id: user.id,
      name: `${kb.name} - ${clientType}`,
      redirect_uris: [],
      scopes: ['search', 'list_sources', 'get_info'],
    })

    if (clientError) {
      console.error('Error creating OAuth client:', clientError)
      return NextResponse.json(
        { error: 'Failed to create connection' },
        { status: 500 }
      )
    }

    // Create OAuth token
    const { error: tokenError } = await supabase.from('oauth_tokens').insert({
      client_id: clientId,
      knowledge_base_id: kb.id,
      user_id: user.id,
      access_token_hash: accessTokenHash,
      scopes: ['search', 'list_sources', 'get_info'],
      expires_at: expiresAt.toISOString(),
      subscription_id: subscriptionId,
    })

    if (tokenError) {
      console.error('Error creating OAuth token:', tokenError)
      // Clean up the client we just created
      await supabase.from('oauth_clients').delete().eq('client_id', clientId)
      return NextResponse.json(
        { error: 'Failed to create token' },
        { status: 500 }
      )
    }

    // Generate deeplink if supported
    const deeplink = generateDeeplink(clientType, kb.slug, accessToken)

    return NextResponse.json({
      token: accessToken,
      deeplink,
      clientType,
      expiresAt: expiresAt.toISOString(),
      kb: {
        id: kb.id,
        name: kb.name,
        slug: kb.slug,
      },
    })
  } catch (error) {
    console.error('Install token error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
