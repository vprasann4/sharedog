import { NextRequest, NextResponse } from 'next/server'

/**
 * OAuth 2.1 Authorization Server Metadata
 *
 * GET /.well-known/oauth-authorization-server
 *
 * Returns metadata about the OAuth server for auto-configuration
 * Follows RFC 8414
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  const metadata = {
    // Required fields
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/oauth/token`,

    // Optional but recommended
    revocation_endpoint: `${baseUrl}/api/oauth/revoke`,
    registration_endpoint: `${baseUrl}/api/oauth/clients`,

    // Token endpoint authentication methods
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],

    // Response types
    response_types_supported: ['code'],

    // Grant types
    grant_types_supported: ['authorization_code', 'refresh_token'],

    // PKCE support (required for OAuth 2.1)
    code_challenge_methods_supported: ['S256'],

    // Scopes
    scopes_supported: ['search', 'list_sources', 'get_info'],

    // Service documentation
    service_documentation: `${baseUrl}/docs/mcp`,

    // UI locales
    ui_locales_supported: ['en'],
  }

  return NextResponse.json(metadata, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  })
}
