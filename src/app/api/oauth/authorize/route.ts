import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  generateAuthCode,
  hashToken,
  parseScopes,
  isValidRedirectUri,
  oauthError,
  OAUTH_ERRORS,
  TOKEN_EXPIRY,
} from '@/lib/oauth'

/**
 * OAuth 2.1 Authorization Endpoint
 *
 * GET /api/oauth/authorize
 *
 * Query Parameters:
 * - client_id: The OAuth client ID
 * - redirect_uri: Where to redirect after authorization
 * - response_type: Must be "code"
 * - scope: Space-separated list of scopes
 * - state: Random string for CSRF protection
 * - code_challenge: PKCE challenge
 * - code_challenge_method: Must be "S256"
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const clientId = searchParams.get('client_id')
  const redirectUri = searchParams.get('redirect_uri')
  const responseType = searchParams.get('response_type')
  const scope = searchParams.get('scope')
  const state = searchParams.get('state')
  const codeChallenge = searchParams.get('code_challenge')
  const codeChallengeMethod = searchParams.get('code_challenge_method')

  // Validate required parameters
  if (!clientId) {
    return oauthError(OAUTH_ERRORS.INVALID_REQUEST, 'client_id is required')
  }

  if (!redirectUri) {
    return oauthError(OAUTH_ERRORS.INVALID_REQUEST, 'redirect_uri is required')
  }

  if (responseType !== 'code') {
    return oauthError(
      OAUTH_ERRORS.UNSUPPORTED_RESPONSE_TYPE,
      'Only response_type=code is supported',
      redirectUri,
      state || undefined
    )
  }

  // PKCE is required for OAuth 2.1
  if (!codeChallenge) {
    return oauthError(
      OAUTH_ERRORS.INVALID_REQUEST,
      'code_challenge is required (PKCE)',
      redirectUri,
      state || undefined
    )
  }

  if (codeChallengeMethod !== 'S256') {
    return oauthError(
      OAUTH_ERRORS.INVALID_REQUEST,
      'code_challenge_method must be S256',
      redirectUri,
      state || undefined
    )
  }

  // Verify the user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Redirect to login with return URL
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('returnTo', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Look up the client using service client (to bypass RLS for validation)
  const serviceClient = createServiceClient()
  const { data: client, error: clientError } = await serviceClient
    .from('oauth_clients')
    .select('*, knowledge_bases!inner(name, slug, user_id)')
    .eq('client_id', clientId)
    .is('revoked_at', null)
    .single()

  if (clientError || !client) {
    return oauthError(
      OAUTH_ERRORS.INVALID_CLIENT,
      'Invalid or revoked client',
      redirectUri,
      state || undefined
    )
  }

  // Verify the user owns this knowledge base
  if (client.knowledge_bases.user_id !== user.id) {
    return oauthError(
      OAUTH_ERRORS.ACCESS_DENIED,
      'You do not have permission to authorize this client',
      redirectUri,
      state || undefined
    )
  }

  // Validate redirect URI
  const allowedUris = client.redirect_uris || []
  if (!isValidRedirectUri(redirectUri, allowedUris)) {
    return oauthError(
      OAUTH_ERRORS.INVALID_REQUEST,
      'Invalid redirect_uri'
    )
  }

  // Parse and validate scopes
  const requestedScopes = parseScopes(scope)
  const allowedScopes = client.scopes || []

  // Check if requested scopes are subset of allowed scopes
  const validScopes = requestedScopes.filter(s => allowedScopes.includes(s))
  if (validScopes.length === 0) {
    return oauthError(
      OAUTH_ERRORS.INVALID_SCOPE,
      'No valid scopes requested',
      redirectUri,
      state || undefined
    )
  }

  // Generate authorization code
  const authCode = generateAuthCode()
  const codeHash = hashToken(authCode)

  // Store the authorization code
  const { error: insertError } = await serviceClient
    .from('oauth_codes')
    .insert({
      code_hash: codeHash,
      client_id: clientId,
      knowledge_base_id: client.knowledge_base_id,
      user_id: user.id,
      redirect_uri: redirectUri,
      scopes: validScopes,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      expires_at: new Date(Date.now() + TOKEN_EXPIRY.AUTH_CODE * 1000).toISOString(),
    })

  if (insertError) {
    console.error('Error storing auth code:', insertError)
    return oauthError(
      OAUTH_ERRORS.SERVER_ERROR,
      'Failed to generate authorization code',
      redirectUri,
      state || undefined
    )
  }

  // Redirect back with the code
  const callbackUrl = new URL(redirectUri)
  callbackUrl.searchParams.set('code', authCode)
  if (state) {
    callbackUrl.searchParams.set('state', state)
  }

  return NextResponse.redirect(callbackUrl.toString())
}

/**
 * POST /api/oauth/authorize
 *
 * Handle the consent form submission (if we implement a consent UI)
 * For now, we auto-approve since the user owns the KB
 */
export async function POST(request: NextRequest) {
  // For a more complete implementation, this would handle
  // the user's decision from a consent form
  // For now, redirect to GET which auto-approves
  const body = await request.formData()
  const approve = body.get('approve')

  if (approve !== 'true') {
    const redirectUri = body.get('redirect_uri') as string
    const state = body.get('state') as string | null

    if (redirectUri) {
      return oauthError(
        OAUTH_ERRORS.ACCESS_DENIED,
        'User denied the authorization request',
        redirectUri,
        state || undefined
      )
    }

    return oauthError(OAUTH_ERRORS.ACCESS_DENIED, 'User denied the authorization request')
  }

  // Rebuild the GET URL and redirect
  const params = new URLSearchParams()
  for (const [key, value] of body.entries()) {
    if (key !== 'approve' && typeof value === 'string') {
      params.set(key, value)
    }
  }

  const authorizeUrl = new URL('/api/oauth/authorize', request.url)
  authorizeUrl.search = params.toString()

  return NextResponse.redirect(authorizeUrl.toString())
}
