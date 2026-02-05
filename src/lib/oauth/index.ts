import { createHash, randomBytes } from 'crypto'

// OAuth token/code formats
export const TOKEN_PREFIXES = {
  ACCESS: 'sha_kb_',
  REFRESH: 'shr_kb_',
  CODE: 'shc_',
  CLIENT_ID: 'mcp_client_',
  CLIENT_SECRET: 'mcp_secret_',
} as const

// Token expiration times
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 60 * 60, // 1 hour
  REFRESH_TOKEN: 60 * 60 * 24 * 30, // 30 days
  AUTH_CODE: 60 * 10, // 10 minutes
} as const

// Available OAuth scopes
export const OAUTH_SCOPES = {
  SEARCH: 'search',
  LIST_SOURCES: 'list_sources',
  GET_INFO: 'get_info',
} as const

export type OAuthScope = (typeof OAUTH_SCOPES)[keyof typeof OAUTH_SCOPES]

export const DEFAULT_SCOPES: OAuthScope[] = ['search', 'list_sources', 'get_info']

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(prefix: string, length: number = 32): string {
  const randomPart = randomBytes(length).toString('base64url')
  return `${prefix}${randomPart}`
}

/**
 * Hash a token for storage (using SHA-256)
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Generate a client ID
 */
export function generateClientId(): string {
  return generateToken(TOKEN_PREFIXES.CLIENT_ID, 16)
}

/**
 * Generate a client secret
 */
export function generateClientSecret(): string {
  return generateToken(TOKEN_PREFIXES.CLIENT_SECRET, 32)
}

/**
 * Generate an access token
 */
export function generateAccessToken(kbId: string): string {
  const shortKbId = kbId.split('-')[0] // Use first segment of UUID
  return generateToken(`${TOKEN_PREFIXES.ACCESS}${shortKbId}_`, 32)
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(kbId: string): string {
  const shortKbId = kbId.split('-')[0]
  return generateToken(`${TOKEN_PREFIXES.REFRESH}${shortKbId}_`, 32)
}

/**
 * Generate an authorization code
 */
export function generateAuthCode(): string {
  return generateToken(TOKEN_PREFIXES.CODE, 32)
}

/**
 * Validate PKCE code challenge
 */
export function validateCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: 'S256' | 'plain' = 'S256'
): boolean {
  if (method === 'plain') {
    return codeVerifier === codeChallenge
  }

  // S256: BASE64URL(SHA256(code_verifier))
  const hash = createHash('sha256').update(codeVerifier).digest()
  const computedChallenge = hash.toString('base64url')
  return computedChallenge === codeChallenge
}

/**
 * Generate PKCE code challenge from verifier
 */
export function generateCodeChallenge(codeVerifier: string, method: 'S256' | 'plain' = 'S256'): string {
  if (method === 'plain') {
    return codeVerifier
  }

  const hash = createHash('sha256').update(codeVerifier).digest()
  return hash.toString('base64url')
}

/**
 * Parse scopes from space-separated string
 */
export function parseScopes(scopeString: string | null): OAuthScope[] {
  if (!scopeString) return DEFAULT_SCOPES

  const requestedScopes = scopeString.split(' ').filter(Boolean)
  const validScopes = requestedScopes.filter((s): s is OAuthScope =>
    Object.values(OAUTH_SCOPES).includes(s as OAuthScope)
  )

  return validScopes.length > 0 ? validScopes : DEFAULT_SCOPES
}

/**
 * Validate redirect URI
 */
export function isValidRedirectUri(uri: string, allowedUris: string[]): boolean {
  // Allow localhost for development
  try {
    const url = new URL(uri)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return true
    }
  } catch {
    return false
  }

  // Check against allowed URIs
  return allowedUris.some(allowed => {
    // Exact match or wildcard subdomain match
    if (uri === allowed) return true
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2)
      try {
        const uriUrl = new URL(uri)
        return uriUrl.hostname.endsWith(domain)
      } catch {
        return false
      }
    }
    return false
  })
}

/**
 * Build OAuth error response
 */
export function oauthError(
  error: string,
  description: string,
  redirectUri?: string,
  state?: string
): Response {
  if (redirectUri) {
    const url = new URL(redirectUri)
    url.searchParams.set('error', error)
    url.searchParams.set('error_description', description)
    if (state) url.searchParams.set('state', state)
    return Response.redirect(url.toString(), 302)
  }

  return new Response(
    JSON.stringify({ error, error_description: description }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

/**
 * OAuth error codes
 */
export const OAUTH_ERRORS = {
  INVALID_REQUEST: 'invalid_request',
  UNAUTHORIZED_CLIENT: 'unauthorized_client',
  ACCESS_DENIED: 'access_denied',
  UNSUPPORTED_RESPONSE_TYPE: 'unsupported_response_type',
  INVALID_SCOPE: 'invalid_scope',
  SERVER_ERROR: 'server_error',
  TEMPORARILY_UNAVAILABLE: 'temporarily_unavailable',
  INVALID_CLIENT: 'invalid_client',
  INVALID_GRANT: 'invalid_grant',
  UNSUPPORTED_GRANT_TYPE: 'unsupported_grant_type',
} as const
