import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, createKbProduct } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { knowledgeBaseId, clientType, successUrl, cancelUrl } = body

    if (!knowledgeBaseId) {
      return NextResponse.json({ error: 'Missing knowledge base ID' }, { status: 400 })
    }

    // Get the KB with Stripe info
    const { data: kb, error: kbError } = await supabase
      .from('knowledge_bases')
      .select('id, name, slug, pricing_model, price_cents, stripe_product_id, stripe_price_id, user_id')
      .eq('id', knowledgeBaseId)
      .eq('visibility', 'public')
      .single()

    if (kbError || !kb) {
      return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 })
    }

    if (kb.pricing_model === 'free') {
      return NextResponse.json({ error: 'This knowledge base is free' }, { status: 400 })
    }

    // Check if user already has an active subscription
    const { data: existingSub } = await supabase
      .from('kb_subscriptions')
      .select('id, status')
      .eq('knowledge_base_id', knowledgeBaseId)
      .eq('subscriber_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    if (existingSub) {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 400 })
    }

    // Create Stripe product/price if they don't exist
    let priceId = kb.stripe_price_id
    let productId = kb.stripe_product_id

    if (!priceId || !productId) {
      const { product, price } = await createKbProduct({
        knowledgeBaseId: kb.id,
        kbName: kb.name,
        monthlyPriceCents: kb.price_cents,
      })

      productId = product.id
      priceId = price.id

      // Update KB with Stripe IDs
      await supabase
        .from('knowledge_bases')
        .update({
          stripe_product_id: productId,
          stripe_price_id: priceId,
        })
        .eq('id', kb.id)
    }

    // Build success URL with params
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const defaultSuccessUrl = `${baseUrl}/kb/${kb.slug}/checkout/success?session_id={CHECKOUT_SESSION_ID}&client_type=${clientType || 'generic'}`
    const defaultCancelUrl = `${baseUrl}/kb/${kb.slug}?checkout=canceled`

    // Create Stripe checkout session
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
      success_url: successUrl || defaultSuccessUrl,
      cancel_url: cancelUrl || defaultCancelUrl,
      customer_email: user.email || undefined,
      metadata: {
        knowledge_base_id: kb.id,
        subscriber_id: user.id,
        client_type: clientType || 'generic',
        kb_name: kb.name,
        kb_slug: kb.slug,
      },
      subscription_data: {
        metadata: {
          knowledge_base_id: kb.id,
          subscriber_id: user.id,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
