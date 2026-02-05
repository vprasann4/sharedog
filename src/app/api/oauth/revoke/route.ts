import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hashToken, oauthError, OAUTH_ERRORS } from '@/lib/oauth'

/**
 * OAuth 2.1 Token Revocation Endpoint
 *
 * POST /api/oauth/revoke
 *
 * Revokes an access token or refresh token
 * Follows RFC 7009
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

  const { token, token_type_hint } = body

  if (!token) {
    return oauthError(OAUTH_ERRORS.INVALID_REQUEST, 'Missing token parameter')
  }

  const supabase = createServiceClient()
  const tokenHash = hashToken(token)

  // Try to find and delete the token
  // Per RFC 7009, we should return 200 even if the token doesn't exist
  if (token_type_hint === 'refresh_token') {
    // Try refresh token first
    await supabase
      .from('oauth_tokens')
      .delete()
      .eq('refresh_token_hash', tokenHash)
  } else {
    // Try access token first, then refresh token
    const { data: deleted } = await supabase
      .from('oauth_tokens')
      .delete()
      .eq('access_token_hash', tokenHash)
      .select('id')

    if (!deleted || deleted.length === 0) {
      // Try as refresh token
      await supabase
        .from('oauth_tokens')
        .delete()
        .eq('refresh_token_hash', tokenHash)
    }
  }

  // Always return 200 OK per RFC 7009
  return new NextResponse(null, { status: 200 })
}

// Enable CORS for revocation endpoint
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
