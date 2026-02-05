'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { KnowledgeBase } from '@/lib/supabase/types'
import { updateKnowledgeBase, deleteKnowledgeBase } from '@/app/(dashboard)/knowledge-bases/actions'

interface KnowledgeBaseSettingsProps {
  knowledgeBase: KnowledgeBase
}

export function KnowledgeBaseSettings({ knowledgeBase }: KnowledgeBaseSettingsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state
  const [name, setName] = useState(knowledgeBase.name)
  const [description, setDescription] = useState(knowledgeBase.description || '')
  const [visibility, setVisibility] = useState<'private' | 'public'>(knowledgeBase.visibility)
  const [mcpEnabled, setMcpEnabled] = useState(knowledgeBase.mcp_enabled)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const result = await updateKnowledgeBase(knowledgeBase.id, {
        name,
        description: description || null,
        visibility,
        mcp_enabled: mcpEnabled,
      })

      if (result.success) {
        toast.success('Settings saved')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to save settings')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteKnowledgeBase(knowledgeBase.id)

      if (result.success) {
        toast.success('Knowledge base deleted')
        router.push('/knowledge-bases')
      } else {
        toast.error(result.error || 'Failed to delete')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const hasChanges =
    name !== knowledgeBase.name ||
    description !== (knowledgeBase.description || '') ||
    visibility !== knowledgeBase.visibility ||
    mcpEnabled !== knowledgeBase.mcp_enabled

  return (
    <div className="space-y-8">
      {/* General Settings */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">General</h2>
          <p className="text-sm text-muted-foreground">
            Basic information about your knowledge base
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Knowledge Base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of what this knowledge base contains"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={knowledgeBase.slug}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              The URL-safe identifier for your knowledge base. Cannot be changed.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Access Control */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Access Control</h2>
          <p className="text-sm text-muted-foreground">
            Control who can access your knowledge base
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select value={visibility} onValueChange={(v: 'private' | 'public') => setVisibility(v)}>
              <SelectTrigger id="visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private - Only you can access</SelectItem>
                <SelectItem value="public">Public - Anyone can access via MCP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="mcp-enabled">MCP Endpoint</Label>
              <p className="text-sm text-muted-foreground">
                Allow AI assistants to connect via the Model Context Protocol
              </p>
            </div>
            <Switch
              id="mcp-enabled"
              checked={mcpEnabled}
              onCheckedChange={setMcpEnabled}
            />
          </div>

          {visibility === 'public' && mcpEnabled && (
            <div className="rounded-lg bg-muted/50 p-4 text-sm">
              <p className="font-medium">MCP Endpoint URL:</p>
              <code className="text-xs text-muted-foreground break-all">
                {typeof window !== 'undefined' ? window.location.origin : ''}/api/mcp/{knowledgeBase.slug}
              </code>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      <Separator />

      {/* Danger Zone */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground">
            Irreversible and destructive actions
          </p>
        </div>

        <div className="rounded-lg border border-destructive/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Knowledge Base</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this knowledge base and all its data. This cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    knowledge base <strong>{knowledgeBase.name}</strong> and all of its
                    sources, chunks, and embeddings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                  >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete Forever
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  )
}
