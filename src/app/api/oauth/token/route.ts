import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  validateCodeChallenge,
  oauthError,
  OAUTH_ERRORS,
  TOKEN_EXPIRY,
} from '@/lib/oauth'

/**
 * OAuth 2.1 Token Endpoint
 *
 * POST /api/oauth/token
 *
 * Supports:
 * - grant_type=authorization_code (exchange code for tokens)
 * - grant_type=refresh_token (refresh access token)
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''

  let body: Record<string, string>

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData()
    body = Object.fromEntries(
      Array.from(formData.entries()).map(([k, v]) => [k, String(v)])
    )
  } else if (contentType.includes('application/json')) {
    body = await request.json()
  } else {
    return oauthError(OAUTH_ERRORS.INVALID_REQUEST, 'Unsupported content type')
  }

  const grantType = body.grant_type

  if (grantType === 'authorization_code') {
    return handleAuthorizationCode(body)
  } else if (grantType === 'refresh_token') {
    return handleRefreshToken(body)
  } else {
    return oauthError(
      OAUTH_ERRORS.UNSUPPORTED_GRANT_TYPE,
      'Supported grant types: authorization_code, refresh_token'
    )
  }
}

async function handleAuthorizationCode(body: Record<string, string>) {
  const { code, redirect_uri, client_id, code_verifier } = body

  if (!code || !redirect_uri || !client_id || !code_verifier) {
    return oauthError(
      OAUTH_ERRORS.INVALID_REQUEST,
      'Missing required parameters: code, redirect_uri, client_id, code_verifier'
    )
  }

  const supabase = createServiceClient()

  // Look up the authorization code
  const codeHash = hashToken(code)
  const { data: authCode, error: codeError } = await supabase
    .from('oauth_codes')
    .select('*')
    .eq('code_hash', codeHash)
    .is('used_at', null)
    .single()

  if (codeError || !authCode) {
    return oauthError(OAUTH_ERRORS.INVALID_GRANT, 'Invalid or expired authorization code')
  }

  // Check expiration
  if (new Date(authCode.expires_at) < new Date()) {
    // Mark as used to prevent further attempts
    await supabase
      .from('oauth_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', authCode.id)

    return oauthError(OAUTH_ERRORS.INVALID_GRANT, 'Authorization code has expired')
  }

  // Validate client_id matches
  if (authCode.client_id !== client_id) {
    return oauthError(OAUTH_ERRORS.INVALID_GRANT, 'Client ID mismatch')
  }

  // Validate redirect_uri matches
  if (authCode.redirect_uri !== redirect_uri) {
    return oauthError(OAUTH_ERRORS.INVALID_GRANT, 'Redirect URI mismatch')
  }

  // Validate PKCE
  const challengeMethod = (authCode.code_challenge_method || 'S256') as 'S256' | 'plain'
  if (!validateCodeChallenge(code_verifier, authCode.code_challenge || '', challengeMethod)) {
    return oauthError(OAUTH_ERRORS.INVALID_GRANT, 'Invalid code verifier')
  }

  // Mark code as used (prevent replay)
  await supabase
    .from('oauth_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', authCode.id)

  // Generate tokens
  const accessToken = generateAccessToken(authCode.knowledge_base_id)
  const refreshToken = generateRefreshToken(authCode.knowledge_base_id)

  const accessTokenHash = hashToken(accessToken)
  const refreshTokenHash = hashToken(refreshToken)

  const now = new Date()
  const accessExpires = new Date(now.getTime() + TOKEN_EXPIRY.ACCESS_TOKEN * 1000)
  const refreshExpires = new Date(now.getTime() + TOKEN_EXPIRY.REFRESH_TOKEN * 1000)

  // Store tokens
  const { error: tokenError } = await supabase
    .from('oauth_tokens')
    .insert({
      client_id: authCode.client_id,
      knowledge_base_id: authCode.knowledge_base_id,
      user_id: authCode.user_id,
      access_token_hash: accessTokenHash,
      refresh_token_hash: refreshTokenHash,
      scopes: authCode.scopes,
      expires_at: accessExpires.toISOString(),
      refresh_expires_at: refreshExpires.toISOString(),
    })

  if (tokenError) {
    console.error('Error storing tokens:', tokenError)
    return oauthError(OAUTH_ERRORS.SERVER_ERROR, 'Failed to generate tokens')
  }

  // Return tokens
  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: TOKEN_EXPIRY.ACCESS_TOKEN,
    refresh_token: refreshToken,
    scope: authCode.scopes.join(' '),
  })
}

async function handleRefreshToken(body: Record<string, string>) {
  const { refresh_token, client_id } = body

  if (!refresh_token) {
    return oauthError(OAUTH_ERRORS.INVALID_REQUEST, 'Missing refresh_token')
  }

  const supabase = createServiceClient()

  // Look up the refresh token
  const refreshTokenHash = hashToken(refresh_token)
  const { data: existingToken, error: tokenError } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('refresh_token_hash', refreshTokenHash)
    .single()

  if (tokenError || !existingToken) {
    return oauthError(OAUTH_ERRORS.INVALID_GRANT, 'Invalid refresh token')
  }

  // Check refresh token expiration
  if (existingToken.refresh_expires_at && new Date(existingToken.refresh_expires_at) < new Date()) {
    // Delete expired token
    await supabase.from('oauth_tokens').delete().eq('id', existingToken.id)
    return oauthError(OAUTH_ERRORS.INVALID_GRANT, 'Refresh token has expired')
  }

  // Optionally validate client_id if provided
  if (client_id && existingToken.client_id !== client_id) {
    return oauthError(OAUTH_ERRORS.INVALID_GRANT, 'Client ID mismatch')
  }

  // Generate new tokens (rotate refresh token for security)
  const newAccessToken = generateAccessToken(existingToken.knowledge_base_id)
  const newRefreshToken = generateRefreshToken(existingToken.knowledge_base_id)

  const newAccessTokenHash = hashToken(newAccessToken)
  const newRefreshTokenHash = hashToken(newRefreshToken)

  const now = new Date()
  const accessExpires = new Date(now.getTime() + TOKEN_EXPIRY.ACCESS_TOKEN * 1000)
  const refreshExpires = new Date(now.getTime() + TOKEN_EXPIRY.REFRESH_TOKEN * 1000)

  // Update tokens (rotate refresh token)
  const { error: updateError } = await supabase
    .from('oauth_tokens')
    .update({
      access_token_hash: newAccessTokenHash,
      refresh_token_hash: newRefreshTokenHash,
      expires_at: accessExpires.toISOString(),
      refresh_expires_at: refreshExpires.toISOString(),
      last_used_at: now.toISOString(),
    })
    .eq('id', existingToken.id)

  if (updateError) {
    console.error('Error updating tokens:', updateError)
    return oauthError(OAUTH_ERRORS.SERVER_ERROR, 'Failed to refresh tokens')
  }

  // Return new tokens
  return NextResponse.json({
    access_token: newAccessToken,
    token_type: 'Bearer',
    expires_in: TOKEN_EXPIRY.ACCESS_TOKEN,
    refresh_token: newRefreshToken,
    scope: existingToken.scopes.join(' '),
  })
}

// Enable CORS for token endpoint
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
