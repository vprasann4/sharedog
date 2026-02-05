'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Copy, ExternalLink, AlertCircle, Loader2, Trash2, Key } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { KnowledgeBase, OAuthClient } from '@/lib/supabase/types'

interface MCPConnectModalProps {
  knowledgeBase: KnowledgeBase
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface OAuthClientWithKB extends Omit<OAuthClient, 'knowledge_base_id'> {
  knowledge_bases: { id: string; name: string; slug: string } | null
}

interface NewClientResponse {
  client_id: string
  client_secret: string
  name: string
  mcp_config: {
    url: string
  }
}

export function MCPConnectModal({ knowledgeBase, open, onOpenChange }: MCPConnectModalProps) {
  const router = useRouter()
  const [copiedConfig, setCopiedConfig] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<OAuthClientWithKB[]>([])
  const [newClient, setNewClient] = useState<NewClientResponse | null>(null)
  const [clientName, setClientName] = useState('')
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mcpUrl = process.env.NEXT_PUBLIC_MCP_URL || 'https://mcp.sharedog.app'
  const mcpEndpoint = `${mcpUrl}/mcp/${knowledgeBase.slug}`

  // Fetch existing clients
  useEffect(() => {
    if (open) {
      fetchClients()
    }
  }, [open, knowledgeBase.id])

  async function fetchClients() {
    setLoading(true)
    try {
      const res = await fetch(`/api/oauth/clients?knowledge_base_id=${knowledgeBase.id}`)
      if (!res.ok) throw new Error('Failed to fetch clients')
      const data = await res.json()
      setClients(data.clients || [])
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    } finally {
      setLoading(false)
    }
  }

  async function createClient() {
    if (!clientName.trim()) {
      setError('Please enter a name for this connection')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/oauth/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledge_base_id: knowledgeBase.id,
          name: clientName.trim(),
          redirect_uris: [],
          scopes: ['search', 'list_sources', 'get_info'],
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error_description || 'Failed to create client')
      }

      const data = await res.json()
      setNewClient(data)
      setClientName('')
      await fetchClients()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection')
    } finally {
      setCreating(false)
    }
  }

  async function revokeClient(clientId: string) {
    setRevoking(clientId)
    try {
      const res = await fetch('/api/oauth/clients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      })

      if (!res.ok) throw new Error('Failed to revoke client')
      await fetchClients()
    } catch (err) {
      console.error('Failed to revoke client:', err)
    } finally {
      setRevoking(null)
    }
  }

  // Build MCP config with token
  function getMcpConfig(token: string) {
    return {
      mcpServers: {
        [knowledgeBase.slug]: {
          type: 'http',
          url: mcpEndpoint,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    }
  }

  const copyConfig = async (token: string) => {
    await navigator.clipboard.writeText(JSON.stringify(getMcpConfig(token), null, 2))
    setCopiedConfig(true)
    setTimeout(() => setCopiedConfig(false), 2000)
  }

  const copyUrl = async () => {
    await navigator.clipboard.writeText(mcpEndpoint)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const isDisabled = !knowledgeBase.mcp_enabled

  // Active (non-revoked) clients
  const activeClients = clients.filter(c => !c.revoked_at)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect via MCP</DialogTitle>
          <DialogDescription>
            Connect your AI assistant to this knowledge base using OAuth authentication.
          </DialogDescription>
        </DialogHeader>

        {isDisabled && (
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-600">MCP is disabled</p>
              <p className="text-muted-foreground">
                Enable MCP in the knowledge base settings to allow AI assistants to connect.
              </p>
            </div>
          </div>
        )}

        {!isDisabled && (
          <Tabs defaultValue="new" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">Create Connection</TabsTrigger>
              <TabsTrigger value="existing">
                Active Connections {activeClients.length > 0 && `(${activeClients.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-4 mt-4">
              {newClient ? (
                // Show new client credentials (only shown once!)
                <div className="space-y-4">
                  <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-600">Connection created!</p>
                      <p className="text-muted-foreground">
                        Save these credentials now - the secret will not be shown again.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>MCP Configuration</Label>
                    <p className="text-sm text-muted-foreground">
                      Copy this configuration to your AI assistant settings.
                    </p>
                    <div className="relative">
                      <pre className="p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
                        {JSON.stringify(getMcpConfig(newClient.client_secret), null, 2)}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyConfig(newClient.client_secret)}
                      >
                        {copiedConfig ? (
                          <><Check className="mr-1 h-3 w-3" /> Copied</>
                        ) : (
                          <><Copy className="mr-1 h-3 w-3" /> Copy</>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Access Token</Label>
                    <p className="text-sm text-muted-foreground">
                      Use this token in the Authorization header if configuring manually.
                    </p>
                    <code className="block p-3 bg-muted rounded-lg text-sm font-mono break-all">
                      Bearer {newClient.client_secret}
                    </code>
                  </div>

                  <Button onClick={() => setNewClient(null)} variant="outline" className="w-full">
                    Create Another Connection
                  </Button>
                </div>
              ) : (
                // Create new connection form
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-name">Connection Name</Label>
                    <Input
                      id="client-name"
                      placeholder="e.g., Claude Desktop, Cursor, etc."
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      disabled={creating}
                    />
                    <p className="text-sm text-muted-foreground">
                      Give this connection a name so you can identify it later.
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Search knowledge base</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>List sources</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>View knowledge base info</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={createClient}
                    disabled={creating || !clientName.trim()}
                    className="w-full"
                  >
                    {creating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                    ) : (
                      <><Key className="mr-2 h-4 w-4" /> Create Connection</>
                    )}
                  </Button>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <Label>MCP Endpoint</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono break-all">
                      {mcpEndpoint}
                    </code>
                    <Button variant="outline" size="icon" onClick={copyUrl}>
                      {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="existing" className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activeClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No active connections</p>
                  <p className="text-sm">Create a connection to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Created {formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {client.client_id}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => revokeClient(client.client_id)}
                        disabled={revoking === client.client_id}
                      >
                        {revoking === client.client_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center"
          >
            Learn more about MCP
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
