'use client'

import Link from 'next/link'
import { Database, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
      <div className="rounded-full bg-primary/10 p-4">
        <Database className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No knowledge bases yet</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Create your first knowledge base to store your content and make it queryable by AI clients.
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link href="/knowledge-bases/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Knowledge Base
          </Link>
        </Button>
      </div>
    </div>
  )
}
