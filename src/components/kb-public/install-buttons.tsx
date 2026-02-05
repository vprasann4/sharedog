'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Check, Copy, ExternalLink, AlertCircle } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { KnowledgeBase } from '@/lib/supabase/types'
import { buildMCPServersConfig, supportsDeeplink, type ClientType } from '@/lib/deeplinks'

// Client icons as SVGs
const CursorIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2L2 22h20L12 2zm0 4l6.5 13h-13L12 6z"/>
  </svg>
)

const ClaudeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <circle cx="12" cy="12" r="10"/>
  </svg>
)

const VSCodeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M17 2l5 4.5v11l-5 4.5-12-9 5-4.5 7 5.5V7l-7 5.5-5-4.5L17 2z"/>
  </svg>
)

interface InstallButtonsProps {
  kb: Pick<KnowledgeBase, 'id' | 'name' | 'slug' | 'pricing_model' | 'price_cents' | 'mcp_enabled'>
  user: User | null
  isOwner: boolean
  isSubscribed: boolean
  initialAction?: string
  initialClient?: string
}

type InstallState = 'idle' | 'loading' | 'success' | 'error'

export function InstallButtons({
  kb,
  user,
  isOwner,
  isSubscribed,
  initialAction,
  initialClient,
}: InstallButtonsProps) {
  const router = useRouter()
  const [installState, setInstallState] = useState<InstallState>('idle')
  const [selectedClient, setSelectedClient] = useState<ClientType | null>(null)
  const [showClaudeModal, setShowClaudeModal] = useState(false)
  const [tokenData, setTokenData] = useState<{ token: string; deeplink: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const needsLogin = !user
  const needsSubscription = kb.pricing_model === 'paid' && !isSubscribed && !isOwner

  // Handle initial action from URL params (e.g., after login redirect)
  useEffect(() => {
    if (initialAction === 'install' && initialClient && user && !needsSubscription) {
      handleInstall(initialClient as ClientType)
    }
  }, [initialAction, initialClient, user, needsSubscription])

  async function handleInstall(clientType: ClientType) {
    setSelectedClient(clientType)
    setError(null)

    // If not logged in, redirect to login
    if (needsLogin) {
      const returnUrl = `/kb/${kb.slug}?action=install&client=${clientType}`
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`)
      return
    }

    // If needs subscription, redirect to checkout
    if (needsSubscription) {
      setInstallState('loading')
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            knowledgeBaseId: kb.id,
            clientType,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to start checkout')
        }

        const { url } = await res.json()
        window.location.href = url
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start checkout')
        setInstallState('error')
      }
      return
    }

    // Generate token and install
    setInstallState('loading')
    try {
      const res = await fetch(`/api/kb/${kb.slug}/install-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientType }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate token')
      }

      const data = await res.json()
      setTokenData(data)
      setInstallState('success')

      // If client supports deeplink, redirect
      if (supportsDeeplink(clientType) && data.deeplink) {
        window.location.href = data.deeplink
      } else {
        // Show modal for manual setup (Claude)
        setShowClaudeModal(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install')
      setInstallState('error')
    }
  }

  async function copyConfig() {
    if (!tokenData) return
    const config = buildMCPServersConfig(kb.slug, tokenData.token)
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!kb.mcp_enabled) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p>MCP is not enabled for this knowledge base.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const buttonText = needsLogin
    ? 'Login to install'
    : needsSubscription
      ? `Subscribe to install`
      : 'Add'

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Cursor */}
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2"
          onClick={() => handleInstall('cursor')}
          disabled={installState === 'loading' && selectedClient === 'cursor'}
        >
          {installState === 'loading' && selectedClient === 'cursor' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <CursorIcon />
          )}
          <span className="text-sm">{buttonText} to Cursor</span>
        </Button>

        {/* Claude */}
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2"
          onClick={() => handleInstall('claude')}
          disabled={installState === 'loading' && selectedClient === 'claude'}
        >
          {installState === 'loading' && selectedClient === 'claude' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ClaudeIcon />
          )}
          <span className="text-sm">{buttonText} to Claude</span>
        </Button>

        {/* VS Code */}
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2"
          onClick={() => handleInstall('vscode')}
          disabled={installState === 'loading' && selectedClient === 'vscode'}
        >
          {installState === 'loading' && selectedClient === 'vscode' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <VSCodeIcon />
          )}
          <span className="text-sm">{buttonText} to VS Code</span>
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive mt-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Claude manual setup modal */}
      <Dialog open={showClaudeModal} onOpenChange={setShowClaudeModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add to Claude Desktop</DialogTitle>
            <DialogDescription>
              Copy this configuration to your Claude Desktop settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">MCP Configuration</label>
                <Button variant="ghost" size="sm" onClick={copyConfig}>
                  {copied ? (
                    <><Check className="mr-1 h-3 w-3" /> Copied</>
                  ) : (
                    <><Copy className="mr-1 h-3 w-3" /> Copy</>
                  )}
                </Button>
              </div>
              <pre className="p-4 bg-muted rounded-lg text-xs font-mono overflow-x-auto max-h-64">
                {tokenData && JSON.stringify(buildMCPServersConfig(kb.slug, tokenData.token), null, 2)}
              </pre>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium">Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Open Claude Desktop settings</li>
                <li>Navigate to Developer → Edit Config</li>
                <li>Add the configuration above to your mcpServers</li>
                <li>Save and restart Claude Desktop</li>
              </ol>
            </div>

            <a
              href="https://support.anthropic.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-primary hover:underline"
            >
              Learn more about Claude MCP setup
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
