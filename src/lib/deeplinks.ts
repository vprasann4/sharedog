/**
 * Generate one-click install deeplinks for various AI clients
 */

const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_URL || 'https://mcp.sharedog.app'

export type ClientType = 'cursor' | 'vscode' | 'vscode-insiders' | 'claude' | 'generic'

interface MCPConfig {
  type: 'http'
  url: string
  headers?: {
    Authorization: string
  }
}

/**
 * Build the MCP config object for a knowledge base
 */
export function buildMCPConfig(slug: string, token: string): MCPConfig {
  return {
    type: 'http',
    url: `${MCP_SERVER_URL}/mcp/${slug}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}

/**
 * Build the full MCP servers config (for Claude Desktop format)
 */
export function buildMCPServersConfig(slug: string, token: string) {
  return {
    mcpServers: {
      [slug]: buildMCPConfig(slug, token),
    },
  }
}

/**
 * Generate a Cursor deeplink for one-click installation
 *
 * Format: cursor://anysphere.cursor-deeplink/mcp/install?name={name}&config={base64Config}
 */
export function generateCursorDeeplink(slug: string, token: string): string {
  const config = buildMCPConfig(slug, token)
  const configBase64 = btoa(JSON.stringify(config))

  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(slug)}&config=${encodeURIComponent(configBase64)}`
}

/**
 * Generate a VS Code deeplink for one-click installation
 *
 * Format: vscode:mcp/install?{url-encoded-json}
 */
export function generateVSCodeDeeplink(slug: string, token: string, insiders = false): string {
  const config = {
    name: slug,
    type: 'http',
    url: `${MCP_SERVER_URL}/mcp/${slug}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }

  const protocol = insiders ? 'vscode-insiders' : 'vscode'
  return `${protocol}:mcp/install?${encodeURIComponent(JSON.stringify(config))}`
}

/**
 * Generate the appropriate deeplink based on client type
 */
export function generateDeeplink(clientType: ClientType, slug: string, token: string): string | null {
  switch (clientType) {
    case 'cursor':
      return generateCursorDeeplink(slug, token)
    case 'vscode':
      return generateVSCodeDeeplink(slug, token, false)
    case 'vscode-insiders':
      return generateVSCodeDeeplink(slug, token, true)
    case 'claude':
    case 'generic':
    default:
      // Claude Desktop and generic don't support deeplinks
      return null
  }
}

/**
 * Get display name for client type
 */
export function getClientDisplayName(clientType: ClientType): string {
  switch (clientType) {
    case 'cursor':
      return 'Cursor'
    case 'vscode':
      return 'VS Code'
    case 'vscode-insiders':
      return 'VS Code Insiders'
    case 'claude':
      return 'Claude Desktop'
    case 'generic':
    default:
      return 'MCP Client'
  }
}

/**
 * Check if a client type supports deeplinks
 */
export function supportsDeeplink(clientType: ClientType): boolean {
  return ['cursor', 'vscode', 'vscode-insiders'].includes(clientType)
}
