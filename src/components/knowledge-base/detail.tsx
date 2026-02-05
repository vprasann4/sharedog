'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe, Lock, Settings, RefreshCw, Plus, FileText, Link as LinkIcon, Trash2, MoreHorizontal, Loader2, Check, AlertCircle, Clock, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { KnowledgeBase, Source } from '@/lib/supabase/types'
import { AddSourceModal } from './add-source-modal'
import { MCPConnectModal } from './mcp-connect-modal'
import { deleteSource } from '@/app/(dashboard)/knowledge-bases/actions'

interface KnowledgeBaseDetailProps {
  knowledgeBase: KnowledgeBase
  sources: Source[]
}

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', className: 'text-yellow-600' },
  processing: { icon: Loader2, label: 'Processing', className: 'text-blue-600 animate-spin' },
  completed: { icon: Check, label: 'Completed', className: 'text-green-600' },
  failed: { icon: AlertCircle, label: 'Failed', className: 'text-red-600' },
}

export function KnowledgeBaseDetail({ knowledgeBase, sources }: KnowledgeBaseDetailProps) {
  const router = useRouter()
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false)
  const [isMCPConnectOpen, setIsMCPConnectOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (sourceId: string) => {
    setDeletingId(sourceId)
    await deleteSource(knowledgeBase.id, sourceId)
    router.refresh()
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{knowledgeBase.name}</h1>
            <Badge variant={knowledgeBase.visibility === 'public' ? 'default' : 'secondary'}>
              {knowledgeBase.visibility === 'public' ? (
                <><Globe className="mr-1 h-3 w-3" /> Public</>
              ) : (
                <><Lock className="mr-1 h-3 w-3" /> Private</>
              )}
            </Badge>
            {knowledgeBase.visibility === 'public' && knowledgeBase.slug && (
              <Link
                href={`/kb/${knowledgeBase.slug}`}
                target="_blank"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                View public page
              </Link>
            )}
          </div>
          {knowledgeBase.description && (
            <p className="text-muted-foreground mt-1">{knowledgeBase.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            Updated {formatDistanceToNow(new Date(knowledgeBase.updated_at), { addSuffix: true })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsMCPConnectOpen(true)}>
            <LinkIcon className="mr-2 h-4 w-4" />
            Connect via MCP
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/knowledge-bases/${knowledgeBase.id}/connections`}>
              <Settings className="mr-2 h-4 w-4" />
              Connections
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/knowledge-bases/${knowledgeBase.id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Data Sources Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Data Sources</h2>
            <p className="text-sm text-muted-foreground">
              Files and URLs that make up this knowledge base
            </p>
          </div>
          <Button onClick={() => setIsAddSourceOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </Button>
        </div>

        {/* Sources count and refresh */}
        <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-2">
          <span>{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
          <Button variant="ghost" size="sm" onClick={() => router.refresh()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Sources Table */}
        {sources.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => {
                  const status = statusConfig[source.status]
                  const StatusIcon = status.icon

                  return (
                    <TableRow key={source.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {source.type === 'file' ? (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Globe className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <div className="font-medium">{source.name}</div>
                            {source.url && (
                              <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                                {source.url}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {source.type === 'file' ? source.mime_type?.split('/')[1]?.toUpperCase() || 'FILE' : 'URL'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={`h-4 w-4 ${status.className}`} />
                          <span className="text-sm">{status.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={deletingId === source.id}>
                              {deletingId === source.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(source.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">No sources added yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add files or URLs to build your knowledge base.
            </p>
          </div>
        )}
      </div>

      {/* Add Source Modal */}
      <AddSourceModal
        knowledgeBaseId={knowledgeBase.id}
        open={isAddSourceOpen}
        onOpenChange={setIsAddSourceOpen}
      />

      {/* MCP Connect Modal */}
      <MCPConnectModal
        knowledgeBase={knowledgeBase}
        open={isMCPConnectOpen}
        onOpenChange={setIsMCPConnectOpen}
      />

      {/* Processing indicator */}
      {sources.some(s => s.status === 'pending' || s.status === 'processing') && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg shadow-lg p-4 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-sm">Processing files in the background...</span>
        </div>
      )}
    </div>
  )
}
