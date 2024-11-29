import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY_TEST') || '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient() 
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

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

    switch (event.type) {
      // Grouped case statements below
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        
        // Map price ID to subscription type
        let subscriptionType = 'free'
        if(subscription.items.data[0].price.id === 'price_1QNDdzECqKh1UYIX1JXvbBXr') {
          subscriptionType = 'basic'
        }

        // Only update if subscription is active
        if(subscription.status === 'active') {
          const { error: dbError } = await supabaseClient.rpc(
            'admin_set_user_tier',
            {
              p_user_email: customer.email,
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
        const canceledCustomer = await stripe.customers.retrieve(canceledSubscription.customer as string)
        
        const { error: dbError } = await supabaseClient.rpc(
          'admin_set_user_tier',
          {
            p_user_email: canceledCustomer.email,
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
