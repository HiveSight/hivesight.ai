import { createClient } from 'jsr:@supabase/supabase-js@2'


// Define the expected request body type
interface RequestBody {
  requester_id: string;  // UUID from auth.uid()
  say_hello_to: string;
}


Deno.serve(async (req: Request) => {
  try {

    const { requester_id, say_hello_to } = await req.json() as RequestBody // compile-time assertion

    if (!requester_id) {  // run-time validation
      throw new Error('requester_id is required')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
          content: `Say hello to ${say_hello_to || 'the world'} in a creative way!` 
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

    const { data: storedResponse, error: dbError } = await supabaseClient
      .from('gpt_hellos')
      .insert({
        requester_id,
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
        hello_id: storedResponse.hello_id,
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
