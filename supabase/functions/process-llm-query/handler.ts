// supabase/functions/process-llm-query/handler.ts

import { Dependencies, RequestBody } from './types.ts';
import { generatePrompt, parseResponse } from './prompt.ts';

export async function handleRequest(
  req: Request,
  dependencies: Dependencies
): Promise<Response> {
  try {
    const {
      query_id,
      prompt,
      response_types,
      hive_size,
      perspective,
      model
    } = await req.json() as RequestBody;

    const { supabaseClient, fetch, openaiApiKey } = dependencies;

    console.log('Processing query:', { query_id, prompt, response_types, hive_size });

    // Generate prompts
    const { systemPrompt, userPrompt } = generatePrompt(prompt, response_types, perspective);

    // Generate responses
    const responses = [];
    for (let i = 0; i < hive_size; i++) {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 1.0,
          max_tokens: 500,
        })
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await openaiResponse.json();
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      // Parse and collect the response
      const parsedResponse = parseResponse(content, response_types);
      responses.push({
        query_id,
        response_text: parsedResponse.open_ended || '',
        likert_rating: parsedResponse.likert,
        created_at: new Date().toISOString()
      });

      console.log('Generated response:', parsedResponse);
    }

    // Insert responses into database
    const { error: insertError } = await supabaseClient
      .from('responses')
      .insert(responses);

    if (insertError) {
      throw new Error(`Failed to insert responses: ${insertError.message}`);
    }

    // Update query status
    const { error: updateError } = await supabaseClient
      .from('queries')
      .update({ execution_status: 'completed' })
      .eq('query_id', query_id);

    if (updateError) {
      throw new Error(`Failed to update query status: ${updateError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      responses_count: responses.length
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in handleRequest:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }), 
      { status: 500 }
    );
  }
}