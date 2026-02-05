'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Key,
  Trash2,
  Loader2,
  Check,
  Copy,
  AlertCircle,
  Activity,
  Clock,
  Search,
  List,
  Info,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import type { KnowledgeBase, OAuthClient } from '@/lib/supabase/types'

interface OAuthClientData {
  id: string
  client_id: string
  name: string
  redirect_uris: string[]
  scopes: string[]
  created_at: string
  revoked_at: string | null
}

interface RequestStat {
  method: string
  created_at: string
}

interface ConnectionsManagerProps {
  knowledgeBase: KnowledgeBase
  clients: OAuthClientData[]
  requestStats: RequestStat[]
}

interface NewClientResponse {
  client_id: string
  client_secret: string
  name: string
  mcp_config: {
    url: string
  }
}

export function ConnectionsManager({
  knowledgeBase,
  clients: initialClients,
  requestStats,
}: ConnectionsManagerProps) {
  const router = useRouter()
  const [clients, setClients] = useState(initialClients)
  const [newClient, setNewClient] = useState<NewClientResponse | null>(null)
  const [clientName, setClientName] = useState('')
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedConfig, setCopiedConfig] = useState(false)

  const mcpUrl = process.env.NEXT_PUBLIC_MCP_URL || 'https://mcp.sharedog.app'
  const mcpEndpoint = `${mcpUrl}/mcp/${knowledgeBase.slug}`

  // Active (non-revoked) clients
  const activeClients = clients.filter((c) => !c.revoked_at)
  const revokedClients = clients.filter((c) => c.revoked_at)

  // Request stats breakdown
  const last24Hours = requestStats.length
  const methodCounts = requestStats.reduce(
    (acc, req) => {
      // Extract the tool name from tools/call or the method itself
      let method = req.method
      if (method === 'tools/call') {
        method = 'search' // Most tools/call are searches
      }
      acc[method] = (acc[method] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

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
      router.refresh()
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
      router.refresh()
      setClients((prev) =>
        prev.map((c) =>
          c.client_id === clientId ? { ...c, revoked_at: new Date().toISOString() } : c
        )
      )
    } catch (err) {
      console.error('Failed to revoke client:', err)
    } finally {
      setRevoking(null)
    }
  }

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

  return (
    <div className="space-y-6">
      {/* Usage Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeClients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{last24Hours}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Searches (24h)</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{methodCounts['tools/call'] || methodCounts['search'] || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MCP Status</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={knowledgeBase.mcp_enabled ? 'default' : 'secondary'}>
              {knowledgeBase.mcp_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Create New Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Connection</CardTitle>
          <CardDescription>
            Generate credentials for a new MCP client like Claude Desktop or Cursor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {newClient ? (
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
                      <>
                        <Check className="mr-1 h-3 w-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-3 w-3" /> Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Access Token</Label>
                <code className="block p-3 bg-muted rounded-lg text-sm font-mono break-all">
                  Bearer {newClient.client_secret}
                </code>
              </div>

              <Button onClick={() => setNewClient(null)} variant="outline">
                Create Another Connection
              </Button>
            </div>
          ) : (
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Connection name (e.g., Claude Desktop)"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  disabled={creating}
                />
              </div>
              <Button onClick={createClient} disabled={creating || !clientName.trim()}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" /> Create
                  </>
                )}
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive mt-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Connections */}
      <Card>
        <CardHeader>
          <CardTitle>Active Connections</CardTitle>
          <CardDescription>
            MCP clients that can access this knowledge base.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeClients.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active connections</p>
              <p className="text-sm">Create a connection above to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="font-mono text-xs">{client.client_id}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {client.scopes.map((scope) => (
                          <Badge key={scope} variant="outline" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={revoking === client.client_id}
                          >
                            {revoking === client.client_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke Connection</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will immediately revoke access for &quot;{client.name}&quot;. Any MCP
                              clients using this connection will no longer be able to access this
                              knowledge base.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => revokeClient(client.client_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Revoke Access
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {requestStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>MCP requests in the last 24 hours.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestStats.slice(0, 10).map((req, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant="outline">{req.method}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(req.created_at), 'MMM d, h:mm a')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {requestStats.length > 10 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Showing 10 of {requestStats.length} requests
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Revoked Connections */}
      {revokedClients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revoked Connections</CardTitle>
            <CardDescription>
              Previously active connections that have been revoked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Revoked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revokedClients.map((client) => (
                  <TableRow key={client.id} className="opacity-50">
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="font-mono text-xs">{client.client_id}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {client.revoked_at &&
                        formatDistanceToNow(new Date(client.revoked_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
