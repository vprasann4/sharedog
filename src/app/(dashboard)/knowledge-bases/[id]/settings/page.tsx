import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { KnowledgeBaseSettings } from '@/components/knowledge-base/settings'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function KnowledgeBaseSettingsPage({ params }: PageProps) {
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

  return (
    <div className="space-y-6 max-w-2xl">
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
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage settings for {knowledgeBase.name}
        </p>
      </div>

      <KnowledgeBaseSettings knowledgeBase={knowledgeBase} />
    </div>
  )
}
