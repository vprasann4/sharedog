import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

/**
 * Check if a user has access to a knowledge base
 * - Owners always have access
 * - Free KBs: any authenticated user has access
 * - Paid KBs: only subscribers with active status
 */
export async function hasKBAccess(
  supabase: SupabaseClient<Database>,
  knowledgeBaseId: string,
  userId: string
): Promise<{ hasAccess: boolean; subscription?: { id: string; status: string } }> {
  // Get KB info
  const { data: kb, error: kbError } = await supabase
    .from('knowledge_bases')
    .select('id, user_id, visibility, pricing_model, mcp_enabled')
    .eq('id', knowledgeBaseId)
    .single()

  if (kbError || !kb) {
    return { hasAccess: false }
  }

  // Owner always has access
  if (kb.user_id === userId) {
    return { hasAccess: true }
  }

  // Must be public and MCP enabled
  if (kb.visibility !== 'public' || !kb.mcp_enabled) {
    return { hasAccess: false }
  }

  // Free KBs: anyone has access
  if (kb.pricing_model === 'free') {
    return { hasAccess: true }
  }

  // Paid KBs: check subscription
  const { data: subscription } = await supabase
    .from('kb_subscriptions')
    .select('id, status, current_period_end')
    .eq('knowledge_base_id', knowledgeBaseId)
    .eq('subscriber_id', userId)
    .in('status', ['active', 'trialing'])
    .single()

  if (!subscription) {
    return { hasAccess: false }
  }

  // Check if subscription hasn't expired
  if (subscription.current_period_end) {
    const expiresAt = new Date(subscription.current_period_end)
    if (expiresAt < new Date()) {
      return { hasAccess: false }
    }
  }

  return {
    hasAccess: true,
    subscription: {
      id: subscription.id,
      status: subscription.status,
    },
  }
}

/**
 * Get subscription status for a user and KB
 */
export async function getSubscriptionStatus(
  supabase: SupabaseClient<Database>,
  knowledgeBaseId: string,
  userId: string
): Promise<{
  isOwner: boolean
  isFree: boolean
  isSubscribed: boolean
  subscription: {
    id: string
    status: string
    currentPeriodEnd: string | null
  } | null
}> {
  // Get KB info
  const { data: kb } = await supabase
    .from('knowledge_bases')
    .select('id, user_id, pricing_model')
    .eq('id', knowledgeBaseId)
    .single()

  if (!kb) {
    return {
      isOwner: false,
      isFree: false,
      isSubscribed: false,
      subscription: null,
    }
  }

  const isOwner = kb.user_id === userId
  const isFree = kb.pricing_model === 'free'

  if (isOwner || isFree) {
    return {
      isOwner,
      isFree,
      isSubscribed: true, // Owners and free users are "subscribed"
      subscription: null,
    }
  }

  // Check for subscription
  const { data: subscription } = await supabase
    .from('kb_subscriptions')
    .select('id, status, current_period_end')
    .eq('knowledge_base_id', knowledgeBaseId)
    .eq('subscriber_id', userId)
    .single()

  const isSubscribed = subscription?.status === 'active' || subscription?.status === 'trialing'

  return {
    isOwner,
    isFree,
    isSubscribed,
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
        }
      : null,
  }
}

/**
 * Create a free subscription record (for free KBs, to track access)
 */
export async function createFreeSubscription(
  supabase: SupabaseClient<Database>,
  knowledgeBaseId: string,
  userId: string
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('kb_subscriptions')
    .insert({
      knowledge_base_id: knowledgeBaseId,
      subscriber_id: userId,
      status: 'active',
      // No Stripe IDs for free subscriptions
    })
    .select('id')
    .single()

  if (error) {
    // Might already exist (conflict), try to fetch it
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('kb_subscriptions')
        .select('id')
        .eq('knowledge_base_id', knowledgeBaseId)
        .eq('subscriber_id', userId)
        .single()
      return existing
    }
    console.error('Error creating free subscription:', error)
    return null
  }

  return data
}
