import { NextRequest, NextResponse } from 'next/server'
import { stripe, getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(supabase, session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(supabase, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(supabase, subscription)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(supabase, invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

/**
 * Handle checkout.session.completed
 * Creates the subscription record in our database
 */
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  session: Stripe.Checkout.Session
) {
  // Get metadata from the session
  const knowledgeBaseId = session.metadata?.knowledge_base_id
  const subscriberId = session.metadata?.subscriber_id
  const clientType = session.metadata?.client_type // cursor, claude, vscode

  if (!knowledgeBaseId || !subscriberId) {
    console.error('Missing metadata in checkout session:', session.id)
    return
  }

  // Get the subscription details
  if (!session.subscription) {
    console.error('No subscription in checkout session:', session.id)
    return
  }

  const subscription = await getStripe().subscriptions.retrieve(session.subscription as string) as Stripe.Subscription

  // Get period dates from items (newer Stripe SDK structure)
  const firstItem = subscription.items?.data?.[0]
  const periodStart = firstItem?.current_period_start
  const periodEnd = firstItem?.current_period_end

  // Create or update subscription record
  const { error } = await supabase
    .from('kb_subscriptions')
    .upsert({
      knowledge_base_id: knowledgeBaseId,
      subscriber_id: subscriberId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: mapStripeStatus(subscription.status),
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    }, {
      onConflict: 'knowledge_base_id,subscriber_id',
    })

  if (error) {
    console.error('Error creating subscription:', error)
    throw error
  }

  console.log(`Subscription created for KB ${knowledgeBaseId}, user ${subscriberId}`)
}

/**
 * Handle subscription updates (renewals, plan changes, etc.)
 */
async function handleSubscriptionUpdate(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  // Get period dates from items (newer Stripe SDK structure)
  const firstItem = subscription.items?.data?.[0]
  const periodStart = firstItem?.current_period_start
  const periodEnd = firstItem?.current_period_end

  const { error } = await supabase
    .from('kb_subscriptions')
    .update({
      status: mapStripeStatus(subscription.status),
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating subscription:', error)
    throw error
  }

  console.log(`Subscription ${subscription.id} updated to status: ${subscription.status}`)
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const { error } = await supabase
    .from('kb_subscriptions')
    .update({
      status: 'expired',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error deleting subscription:', error)
    throw error
  }

  console.log(`Subscription ${subscription.id} marked as expired`)
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice
) {
  // Get subscription ID from parent or from subscription line item
  const subscriptionId = (invoice as { subscription?: string | null }).subscription ||
    invoice.lines?.data?.find(line => line.subscription)?.subscription

  if (!subscriptionId) return

  const subId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id

  const { error } = await supabase
    .from('kb_subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('stripe_subscription_id', subId)

  if (error) {
    console.error('Error updating subscription status:', error)
    throw error
  }

  console.log(`Subscription ${subId} marked as past_due`)
}

/**
 * Map Stripe subscription status to our status enum
 */
function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): 'active' | 'canceled' | 'past_due' | 'expired' | 'trialing' {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'unpaid':
      return 'canceled'
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'expired'
  }
}
