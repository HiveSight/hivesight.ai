import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  try {
    // Parse the request body
    const { email, user_id } = await req.json();

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (!email || !user_id) {
      throw new Error('Both email and user_id are required.');
    }

    // Create a customer in Stripe
    const stripeResponse = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('STRIPE_API_KEY_TEST')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email,
        [`metadata[user_id]`]: user_id,
      }),
    });

    if (!stripeResponse.ok) {
      const error = await stripeResponse.json();
      throw new Error(`Stripe API error: ${stripeResponse.status} - ${error.error.message}`);
    }

    const stripeData = await stripeResponse.json();

    // Store the Stripe customer ID in Supabase
    const { data: storedResponse, error: dbError } = await supabaseClient
      .from('user_stripe_mapping')
      .insert({
        user_id,
        stripe_customer_id: stripeData.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    return new Response(
      JSON.stringify({
        message: 'Stripe customer created and stored successfully.',
        customer_id: stripeData.id,
        stored: true,
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
