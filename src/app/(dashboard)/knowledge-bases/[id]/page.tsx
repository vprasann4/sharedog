import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { KnowledgeBaseDetail } from '@/components/knowledge-base/detail'
import { ArrowLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function KnowledgeBasePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    notFound()
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

  // Fetch sources
  const { data: sources } = await supabase
    .from('sources')
    .select('*')
    .eq('knowledge_base_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to dashboard
        </Link>
      </div>

      <KnowledgeBaseDetail
        knowledgeBase={knowledgeBase}
        sources={sources || []}
      />
    </div>
  )
}
