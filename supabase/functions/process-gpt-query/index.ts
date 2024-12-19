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

    // TODO: Implement logic to query OpenAI, produce responses, and store them below.
    // For now, we'll mock responses with a placeholder.
    const responses = [{
      perspective,
      age: 30,
      income: 50000,
      state: 'General',
      open_ended: "Sample response",
      likert: 4
    }];

    // Insert responses
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

    // Update query status
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
