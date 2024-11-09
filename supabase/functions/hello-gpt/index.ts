
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  try {

    // Get the requester_name from the request body
    const { requester_name } = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Query GPT-3.5
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ 
          role: 'user', 
          content: `Say hello to ${requester_name || 'the world'} in a creative way!` 
        }],
        temperature: 0.7,
        max_tokens: 100,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${response.status} - ${error.error.message}`)
    }

    const data = await response.json()
    const message = data.choices[0].message.content

    // Store in database
    const { data: storedResponse, error: dbError } = await supabaseClient
      .from('gpt_hellos')
      .insert({
        message,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        id: storedResponse.id,
        message,
        stored: true 
      }),
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
