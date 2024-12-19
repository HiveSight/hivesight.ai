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
    const { query_id, requester_id, prompt, model, response_types, hive_size, perspective, age_range, income_range } = await req.json() as RequestBody;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // TODO: Implement actual OpenAI call here:
    // Example:
    // const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
    // const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${openaiKey}`,
    //   },
    //   body: JSON.stringify({
    //     model: model, // or map model if needed
    //     messages: [{ role: 'user', content: prompt }],
    //     temperature: 1.0,
    //     max_tokens: 500,
    //   })
    // });
    // const data = await openaiResponse.json();
    // Parse data to create responses array

    // Mocked responses for now:
    const responses = [{
      perspective,
      age: 30,
      income: 50000,
      state: 'General',
      open_ended: "Mocked response from OpenAI",
      likert: 4
    }];

    const { data: responseInsert, error: insertError } = await supabaseClient
      .from('gpt_responses')
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

    const { error: updateError } = await supabaseClient
      .from('gpt_queries')
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
    console.error('Error in process-gpt-query:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
