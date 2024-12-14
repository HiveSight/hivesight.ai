import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY_TEST') || '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient() 
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

const PRODUCT_TIER_MAP = {
  'prod_RFj6mhqi0fYaZz': 'basic',
  'prod_RMqOmKcAfwwbRe': 'premium',
} as const

type TierType = typeof PRODUCT_TIER_MAP[keyof typeof PRODUCT_TIER_MAP] | 'free'

console.log('Hello from Stripe Webhook!')

Deno.serve(async (req: Request) => {
  try {
    const signature = req.headers.get('Stripe-Signature')

    const body = await req.text()
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    let event 
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature!,
        Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
        undefined,
        cryptoProvider
      )
    } catch (err) {
      return new Response(err.message, { status: 400 })
    }
    console.log(`🔔 Event received: ${event.id}`)

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    async function getUserIdFromCustomerId(customerId: string): Promise<string | null> {
      const { data, error } = await supabaseClient
        .from('user_stripe_mapping')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (error) {
        console.error('Error looking up user:', error)
        throw new Error(`User lookup failed: ${error.message}`)
      }

      return data?.user_id || null
    }

    switch (event.type) {
      // Grouped case statements below
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object
        
        const productId = subscription.items.data[0].price.product as string
        const subscriptionType: TierType = PRODUCT_TIER_MAP[productId] || 'free'

        // Only update if subscription is active
        if(subscription.status === 'active') {

          const userId = await getUserIdFromCustomerId(subscription.customer as string)
          if (!userId) {
            throw new Error(`No user found for Stripe customer: ${subscription.customer}`)
          }

          const { error: dbError } = await supabaseClient.rpc(
            'admin_set_user_tier',
            {
              p_user_id: userId,
              p_tier_name: subscriptionType
            }
          )

          if (dbError) {
            throw new Error(`Database error: ${dbError.message}`)
          }
        }
        break

      case 'customer.subscription.deleted':
        const canceledSubscription = event.data.object


        const canceledUserId = await getUserIdFromCustomerId(canceledSubscription.customer as string)
        if (!canceledUserId) {
          throw new Error(`No user found for Stripe customer: ${canceledSubscription.customer}`)
        }

        const { error: dbError } = await supabaseClient.rpc(
          'admin_set_user_tier',
          {
            p_user_id: canceledUserId,
            p_tier_name: 'free'
          }
        )

        if (dbError) {
          throw new Error(`Database error: ${dbError.message}`)
        }
        break
    }

    return new Response(
      JSON.stringify({ received: true }), 
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
