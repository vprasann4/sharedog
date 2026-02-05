import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KBPublicHeader } from '@/components/kb-public/kb-header'
import { KBSourcePreview } from '@/components/kb-public/kb-source-preview'
import { KBPricingCard } from '@/components/kb-public/kb-pricing-card'
import { KBCreatorCard } from '@/components/kb-public/kb-creator-card'
import { InstallButtons } from '@/components/kb-public/install-buttons'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ action?: string; client?: string; checkout?: string }>
}

export default async function PublicKBPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { action, client, checkout } = await searchParams

  const supabase = await createClient()

  // Get current user (optional - page is public)
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch the knowledge base (must be public)
  const { data: kb, error } = await supabase
    .from('knowledge_bases')
    .select(`
      id,
      name,
      description,
      slug,
      visibility,
      pricing_model,
      price_cents,
      mcp_enabled,
      user_id,
      created_at
    `)
    .eq('slug', slug)
    .eq('visibility', 'public')
    .single()

  if (error || !kb) {
    notFound()
  }

  // Fetch creator profile
  const { data: creator } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, creator_slug, creator_bio')
    .eq('id', kb.user_id)
    .single()

  // Fetch sources preview (limited to 5)
  const { data: sources } = await supabase
    .from('sources')
    .select('id, name, type, mime_type, file_size, created_at')
    .eq('knowledge_base_id', kb.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5)

  // Get total source count
  const { count: totalSources } = await supabase
    .from('sources')
    .select('id', { count: 'exact', head: true })
    .eq('knowledge_base_id', kb.id)
    .eq('status', 'completed')

  // Check subscription status if user is logged in
  let isSubscribed = false
  let isOwner = false
  if (user) {
    isOwner = user.id === kb.user_id
    if (!isOwner && kb.pricing_model === 'paid') {
      const { data: subscription } = await supabase
        .from('kb_subscriptions')
        .select('id, status')
        .eq('knowledge_base_id', kb.id)
        .eq('subscriber_id', user.id)
        .in('status', ['active', 'trialing'])
        .single()
      isSubscribed = !!subscription
    } else {
      // Free KBs or owner
      isSubscribed = true
    }
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      {/* Checkout canceled notice */}
      {checkout === 'canceled' && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-600">
            Checkout was canceled. You can try again when you're ready.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          <KBPublicHeader
            name={kb.name}
            description={kb.description}
            slug={kb.slug}
            pricingModel={kb.pricing_model}
            priceCents={kb.price_cents}
            mcpEnabled={kb.mcp_enabled}
          />

          <KBSourcePreview
            sources={sources || []}
            totalCount={totalSources || 0}
          />

          {/* Install section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Connect to your AI assistant</h2>
            <InstallButtons
              kb={kb}
              user={user}
              isOwner={isOwner}
              isSubscribed={isSubscribed}
              initialAction={action}
              initialClient={client}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <KBPricingCard
            pricingModel={kb.pricing_model}
            priceCents={kb.price_cents}
            isSubscribed={isSubscribed}
            isOwner={isOwner}
            mcpEnabled={kb.mcp_enabled}
          />

          {creator && (
            <KBCreatorCard
              name={creator.full_name}
              avatarUrl={creator.avatar_url}
              creatorSlug={creator.creator_slug}
              bio={creator.creator_bio}
            />
          )}
        </div>
      </div>
    </div>
  )
}
