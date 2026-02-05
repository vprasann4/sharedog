import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ConnectionsManager } from '@/components/knowledge-base/connections-manager'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ConnectionsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch knowledge base
  const { data: knowledgeBase, error } = await supabase
    .from('knowledge_bases')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !knowledgeBase) {
    notFound()
  }

  // Fetch OAuth clients for this KB
  const { data: clients } = await supabase
    .from('oauth_clients')
    .select(`
      id,
      client_id,
      name,
      redirect_uris,
      scopes,
      created_at,
      revoked_at
    `)
    .eq('knowledge_base_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch MCP request stats
  const { data: requestStats } = await supabase
    .from('mcp_requests')
    .select('method, created_at')
    .eq('knowledge_base_id', id)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href={`/knowledge-bases/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {knowledgeBase.name}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">MCP Connections</h1>
        <p className="text-muted-foreground">
          Manage OAuth connections and view usage analytics for {knowledgeBase.name}
        </p>
      </div>

      <ConnectionsManager
        knowledgeBase={knowledgeBase}
        clients={clients || []}
        requestStats={requestStats || []}
      />
    </div>
  )
}
