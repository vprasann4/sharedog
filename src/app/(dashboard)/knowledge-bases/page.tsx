import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Database, Globe, Lock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default async function KnowledgeBasesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: knowledgeBases } = await supabase
    .from('knowledge_bases')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Bases</h1>
          <p className="text-muted-foreground">
            Manage your AI-ready knowledge repositories
          </p>
        </div>
        <Button asChild>
          <Link href="/knowledge-bases/new">
            <Plus className="mr-2 h-4 w-4" />
            New Knowledge Base
          </Link>
        </Button>
      </div>

      {knowledgeBases && knowledgeBases.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {knowledgeBases.map((kb) => (
            <Link key={kb.id} href={`/knowledge-bases/${kb.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Database className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{kb.name}</CardTitle>
                    </div>
                    <Badge variant={kb.visibility === 'public' ? 'default' : 'secondary'}>
                      {kb.visibility === 'public' ? (
                        <><Globe className="mr-1 h-3 w-3" /> Public</>
                      ) : (
                        <><Lock className="mr-1 h-3 w-3" /> Private</>
                      )}
                    </Badge>
                  </div>
                  {kb.description && (
                    <CardDescription className="line-clamp-2 mt-2">
                      {kb.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Updated {formatDistanceToNow(new Date(kb.updated_at), { addSuffix: true })}
                    </span>
                    <Badge variant="outline">
                      {kb.pricing_model === 'free' ? 'Free' : `$${(kb.price_cents / 100).toFixed(2)}`}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Database className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No knowledge bases yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Create your first knowledge base to start adding sources and connect via MCP.
            </p>
            <Button asChild>
              <Link href="/knowledge-bases/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Knowledge Base
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
