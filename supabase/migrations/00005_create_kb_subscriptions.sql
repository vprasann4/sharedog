-- Migration: Create KB Subscriptions Table
-- Purpose: Track subscriber access to knowledge bases (free users get auto-access, paid users need Stripe subscription)

-- Create kb_subscriptions table
CREATE TABLE public.kb_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'expired', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One subscription per user per KB
  UNIQUE(knowledge_base_id, subscriber_id)
);

-- Add Stripe product/price columns to knowledge_bases
ALTER TABLE public.knowledge_bases
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Add subscription reference to oauth_tokens (for linking access to subscriptions)
ALTER TABLE public.oauth_tokens
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.kb_subscriptions(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_kb_subscriptions_subscriber ON public.kb_subscriptions(subscriber_id);
CREATE INDEX idx_kb_subscriptions_kb ON public.kb_subscriptions(knowledge_base_id);
CREATE INDEX idx_kb_subscriptions_status ON public.kb_subscriptions(status);
CREATE INDEX idx_kb_subscriptions_stripe ON public.kb_subscriptions(stripe_subscription_id);

-- Enable RLS
ALTER TABLE public.kb_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.kb_subscriptions
  FOR SELECT
  USING (auth.uid() = subscriber_id);

-- KB owners can view subscribers to their KBs
CREATE POLICY "KB owners can view subscribers"
  ON public.kb_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_bases kb
      WHERE kb.id = knowledge_base_id AND kb.user_id = auth.uid()
    )
  );

-- System can insert subscriptions (via service role for Stripe webhooks)
-- Note: INSERT/UPDATE/DELETE are handled by service role in webhooks
CREATE POLICY "Service role can manage subscriptions"
  ON public.kb_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER handle_kb_subscriptions_updated_at
  BEFORE UPDATE ON public.kb_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to check if user has access to a KB
CREATE OR REPLACE FUNCTION public.has_kb_access(
  p_knowledge_base_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_kb RECORD;
  v_subscription RECORD;
BEGIN
  -- Get KB info
  SELECT * INTO v_kb
  FROM public.knowledge_bases
  WHERE id = p_knowledge_base_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Owner always has access
  IF v_kb.user_id = p_user_id THEN
    RETURN TRUE;
  END IF;

  -- KB must be public and MCP enabled
  IF v_kb.visibility != 'public' OR NOT v_kb.mcp_enabled THEN
    RETURN FALSE;
  END IF;

  -- Free KBs: anyone with account has access
  IF v_kb.pricing_model = 'free' THEN
    RETURN TRUE;
  END IF;

  -- Paid KBs: check for active subscription
  SELECT * INTO v_subscription
  FROM public.kb_subscriptions
  WHERE knowledge_base_id = p_knowledge_base_id
    AND subscriber_id = p_user_id
    AND status IN ('active', 'trialing')
    AND (current_period_end IS NULL OR current_period_end > NOW());

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
