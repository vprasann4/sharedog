'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Lock, Loader2 } from 'lucide-react'
import { createKnowledgeBase } from '../actions'

export default function NewKnowledgeBasePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [pricingModel, setPricingModel] = useState<'free' | 'paid'>('free')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    setError(null)

    const result = await createKnowledgeBase({
      name: name.trim(),
      description: description.trim() || null,
      visibility: isPrivate ? 'private' : 'public',
      pricing_model: pricingModel,
    })

    if (result.success && result.data) {
      router.push(`/knowledge-bases/${result.data.id}`)
    } else {
      setError(!result.success ? result.error : 'Failed to create knowledge base')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/knowledge-bases"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Knowledge Bases
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Create Knowledge Base</h1>
        <p className="text-muted-foreground">
          Set up a new knowledge repository for your AI applications
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Give your knowledge base a name and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="My Knowledge Base"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What is this knowledge base about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Visibility & Access + Pricing side by side */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Visibility & Access */}
          <Card>
            <CardHeader>
              <CardTitle>Visibility & Access</CardTitle>
              <CardDescription>
                Control who can access your knowledge base
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Private</div>
                    <div className="text-sm text-muted-foreground">
                      Only you and invited collaborators can access
                    </div>
                  </div>
                </div>
                <Switch
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing Model */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing Model</CardTitle>
              <CardDescription>
                How should access to this knowledge base be charged?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pricing">Model</Label>
                <Select value={pricingModel} onValueChange={(v) => setPricingModel(v as 'free' | 'paid')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                {pricingModel === 'free'
                  ? 'No charge for accessing this knowledge base'
                  : 'Charge users for accessing this knowledge base'}
              </p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/knowledge-bases">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isLoading || !name.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Knowledge Base
          </Button>
        </div>
      </form>
    </div>
  )
}
