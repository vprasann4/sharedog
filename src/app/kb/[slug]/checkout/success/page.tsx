'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Loader2, AlertCircle, ExternalLink, Copy } from 'lucide-react'
import { buildMCPServersConfig, supportsDeeplink, getClientDisplayName, type ClientType } from '@/lib/deeplinks'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function CheckoutSuccessPage({ params }: PageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [slug, setSlug] = useState<string>('')
  const [clientType, setClientType] = useState<ClientType>('generic')
  const [loading, setLoading] = useState(true)
  const [tokenData, setTokenData] = useState<{ token: string; deeplink: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Get params
  useEffect(() => {
    params.then(p => {
      setSlug(p.slug)
      const client = searchParams.get('client_type') as ClientType || 'generic'
      setClientType(client)
    })
  }, [params, searchParams])

  // Generate token after subscription is confirmed
  useEffect(() => {
    if (!slug) return

    async function generateToken() {
      setLoading(true)
      setError(null)

      // Wait a moment for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000))

      try {
        const res = await fetch(`/api/kb/${slug}/install-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientType }),
        })

        if (!res.ok) {
          const data = await res.json()
          if (res.status === 403) {
            // Subscription might not be processed yet, retry
            await new Promise(resolve => setTimeout(resolve, 3000))
            const retryRes = await fetch(`/api/kb/${slug}/install-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientType }),
            })
            if (retryRes.ok) {
              const retryData = await retryRes.json()
              setTokenData(retryData)
              setLoading(false)
              return
            }
          }
          throw new Error(data.error || 'Failed to generate token')
        }

        const data = await res.json()
        setTokenData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete setup')
      } finally {
        setLoading(false)
      }
    }

    generateToken()
  }, [slug, clientType])

  // Auto-redirect if deeplink is available
  useEffect(() => {
    if (tokenData?.deeplink && supportsDeeplink(clientType)) {
      window.location.href = tokenData.deeplink
    }
  }, [tokenData, clientType])

  async function copyConfig() {
    if (!tokenData) return
    const config = buildMCPServersConfig(slug, tokenData.token)
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div>
                <p className="font-medium">Setting up your connection...</p>
                <p className="text-sm text-muted-foreground">This will only take a moment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Setup Failed
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(`/kb/${slug}`)} className="w-full">
              Return to Knowledge Base
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // For clients with deeplinks, show a "redirecting" message
  if (tokenData?.deeplink && supportsDeeplink(clientType)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Subscription Active!
            </CardTitle>
            <CardDescription>
              Opening {getClientDisplayName(clientType)}...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If {getClientDisplayName(clientType)} doesn't open automatically,{' '}
              <a href={tokenData.deeplink} className="text-primary hover:underline">
                click here
              </a>
              .
            </p>
            <Button variant="outline" onClick={() => router.push(`/kb/${slug}`)} className="w-full">
              Return to Knowledge Base
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // For Claude/generic, show the config
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            Subscription Active!
          </CardTitle>
          <CardDescription>
            Copy the configuration below to add this knowledge base to {getClientDisplayName(clientType)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <pre className="p-4 bg-muted rounded-lg text-xs font-mono overflow-x-auto max-h-48">
              {tokenData && JSON.stringify(buildMCPServersConfig(slug, tokenData.token), null, 2)}
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

          <Button onClick={() => router.push(`/kb/${slug}`)} className="w-full">
            Return to Knowledge Base
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
