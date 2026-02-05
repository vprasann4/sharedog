import type { Env, RateLimitInfo } from '../types'

/**
 * Rate limit configuration
 */
const RATE_LIMIT_CONFIG = {
  // Requests per minute per knowledge base
  KB_LIMIT: 60,
  // Requests per minute per client
  CLIENT_LIMIT: 30,
  // Window size in seconds
  WINDOW_SIZE: 60,
}

/**
 * Generate a rate limit key
 */
function getRateLimitKey(kbId: string, clientId: string | null): string {
  const windowStart = Math.floor(Date.now() / 1000 / RATE_LIMIT_CONFIG.WINDOW_SIZE) * RATE_LIMIT_CONFIG.WINDOW_SIZE
  if (clientId) {
    return `rate:${kbId}:${clientId}:${windowStart}`
  }
  return `rate:${kbId}:${windowStart}`
}

/**
 * Check and update rate limit
 * Returns whether the request is allowed
 */
export async function checkRateLimit(
  env: Env,
  kbId: string,
  clientId: string | null
): Promise<RateLimitInfo> {
  const key = getRateLimitKey(kbId, clientId)
  const limit = clientId ? RATE_LIMIT_CONFIG.CLIENT_LIMIT : RATE_LIMIT_CONFIG.KB_LIMIT
  const windowStart = Math.floor(Date.now() / 1000 / RATE_LIMIT_CONFIG.WINDOW_SIZE) * RATE_LIMIT_CONFIG.WINDOW_SIZE
  const resetAt = windowStart + RATE_LIMIT_CONFIG.WINDOW_SIZE

  try {
    // Get current count
    const currentCount = await env.RATE_LIMITS.get(key)
    const count = currentCount ? parseInt(currentCount, 10) : 0

    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        limit,
      }
    }

    // Increment count with TTL
    await env.RATE_LIMITS.put(key, String(count + 1), {
      expirationTtl: RATE_LIMIT_CONFIG.WINDOW_SIZE,
    })

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt,
      limit,
    }
  } catch (error) {
    console.error('Rate limit error:', error)
    // Fail open - allow request if rate limiting fails
    return {
      allowed: true,
      remaining: limit,
      resetAt,
      limit,
    }
  }
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  headers: Headers,
  rateLimitInfo: RateLimitInfo
): void {
  headers.set('X-RateLimit-Limit', String(rateLimitInfo.limit))
  headers.set('X-RateLimit-Remaining', String(rateLimitInfo.remaining))
  headers.set('X-RateLimit-Reset', String(rateLimitInfo.resetAt))
}
