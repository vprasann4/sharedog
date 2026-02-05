import Stripe from 'stripe'

// Lazily initialize Stripe to avoid build-time errors
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  }
  return stripeInstance
}

// Export for backwards compatibility with webhook
export const stripe = {
  get webhooks() { return getStripe().webhooks },
}

// Helper to create a Stripe Checkout session for KB subscription
export async function createKbCheckoutSession({
  knowledgeBaseId,
  kbName,
  priceId,
  successUrl,
  cancelUrl,
  customerEmail,
}: {
  knowledgeBaseId: string
  kbName: string
  priceId: string
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}) {
  const stripeClient = getStripe()
  const session = await stripeClient.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: customerEmail,
    metadata: {
      knowledge_base_id: knowledgeBaseId,
      kb_name: kbName,
    },
    subscription_data: {
      metadata: {
        knowledge_base_id: knowledgeBaseId,
      },
    },
  })

  return session
}

// Helper to create a Stripe product and price for a KB
export async function createKbProduct({
  knowledgeBaseId,
  kbName,
  monthlyPriceCents,
}: {
  knowledgeBaseId: string
  kbName: string
  monthlyPriceCents: number
}) {
  const stripeClient = getStripe()

  // Create the product
  const product = await stripeClient.products.create({
    name: `${kbName} - Knowledge Base Access`,
    metadata: {
      knowledge_base_id: knowledgeBaseId,
    },
  })

  // Create the monthly price
  const price = await stripeClient.prices.create({
    product: product.id,
    unit_amount: monthlyPriceCents,
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
    metadata: {
      knowledge_base_id: knowledgeBaseId,
    },
  })

  return { product, price }
}

// Helper to get a customer's active subscriptions for a KB
export async function getKbSubscription(customerId: string, knowledgeBaseId: string) {
  const stripeClient = getStripe()
  const subscriptions = await stripeClient.subscriptions.list({
    customer: customerId,
    status: 'active',
  })

  return subscriptions.data.find(
    (sub) => sub.metadata.knowledge_base_id === knowledgeBaseId
  )
}
