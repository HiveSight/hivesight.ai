import { createClient } from 'jsr:@supabase/supabase-js@2';

interface RequestBody {
  query_id: string;
  requester_id: string;
  prompt: string;
  model: string;
  response_types: string[];
  hive_size: number;
  perspective: string;
  age_range: number[];
  income_range: number[];
}

Deno.serve(async (req: Request) => {
  try {
    const {
      query_id,
      requester_id,
      prompt,
      model,
      response_types,
      hive_size,
      perspective,
      age_range,
      income_range
    } = await req.json() as RequestBody;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not set. Please run `supabase secrets set OPENAI_API_KEY=<your-key>`.');
    }

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: model, // Ensure this matches a supported OpenAI model like "gpt-3.5-turbo" or "gpt-4"
        messages: [{ role: 'user', content: prompt }],
        temperature: 1.0,
        max_tokens: 500,
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await openaiResponse.json();

    // Extract the response content. Adjust if you need multiple responses.
    const responseContent = data.choices?.[0]?.message?.content?.trim() || 'No response';

    // Here we create a simple response object. For multiple personas or complex responses,
    // you might need logic to simulate multiple responses or parse the single response into multiple entries.
    // Currently, we just return one response object. Adjust as needed.
    const responses = [{
      perspective,
      age: 30,          // Mocked persona data if needed
      income: 50000,     // Mocked persona data if needed
      state: 'General',  // Mocked persona data if needed
      open_ended: responseContent,
      // If you want to parse a likert response, do so here. For now, just omit if not needed.
    }];

    // Insert into llm_responses
    const { data: responseInsert, error: insertError } = await supabaseClient
      .from('llm_responses')
      .insert({
        query_id: query_id,
        question: prompt,
        responses: responses
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`DB Insert error: ${insertError.message}`);
    }

    // Update llm_queries status to 'completed'
    const { error: updateError } = await supabaseClient
      .from('llm_queries')
      .update({ status: 'completed' })
      .eq('query_id', query_id);

    if (updateError) {
      throw new Error(`DB Update error: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ success: true, response_id: responseInsert.response_id }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in process-llm-query:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
});