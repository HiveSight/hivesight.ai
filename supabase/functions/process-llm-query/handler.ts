import { SupabaseClient } from '@supabase/supabase-js';
import { generatePrompt, parseResponse } from './prompt.ts';
import { RequestBody, Dependencies, ParsedResponse } from './types.ts';

async function generateSingleResponse(
  params: RequestBody,
  opts: {
    openaiApiKey: string;
    fetch: Dependencies['fetch'];
  }
): Promise<ParsedResponse> {
  const { systemPrompt, userPrompt } = generatePrompt(
    params.prompt,
    params.response_types,
    params.perspective
  );

  const openaiResponse = await opts.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${opts.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 1.0,
      max_tokens: 500,
    })
  });

  if (!openaiResponse.ok) {
    const responseData = await openaiResponse.json();
    const message = responseData.error?.message || 'Unknown OpenAI error';
    throw new Error(`OpenAI API error: ${message}`);
  }

  const data = await openaiResponse.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('No response content from OpenAI');
  }

  return parseResponse(content, params.response_types);
}

export async function handleRequest(req: Request, deps: Dependencies): Promise<Response> {
  let requestBody: RequestBody;
  
  try {
    requestBody = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400 }
    );
  }

  // Validate required fields
  if (!requestBody.query_id || !requestBody.requester_id) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400 }
    );
  }

  const { supabaseClient, fetch, openaiApiKey } = deps;

  try {
    // Update status to processing
    await supabaseClient
      .from('queries')
      .update({ execution_status: 'processing' })
      .eq('query_id', requestBody.query_id);

    // Create respondent
    const { data: respondent, error: respondentError } = await supabaseClient
      .from('respondents')
      .insert({
        creator_id: requestBody.requester_id,
        source: 'gpt',
        GESTFIPS: 0,
        PRTAGE: Math.floor(Math.random() * (requestBody.age_range[1] - requestBody.age_range[0]) + requestBody.age_range[0])
      })
      .select()
      .single();

    if (respondentError) throw new Error(`Failed to create respondent: ${respondentError.message}`);

    // Process responses
    for (let i = 0; i < requestBody.hive_size; i++) {
      const response = await generateSingleResponse(requestBody, { openaiApiKey, fetch });

      // Insert base response
      const { data: insertedResponse, error: responseError } = await supabaseClient
        .from('responses')
        .insert({
          query_id: requestBody.query_id,
          respondent_id: respondent.respondent_id,
          response_text: '',
          iteration: 0
        })
        .select()
        .single();

      if (responseError) throw new Error(`Failed to insert response: ${responseError.message}`);

      // Insert attributes
      const attributes = [];
      if (response.open_ended) {
        attributes.push({
          response_id: insertedResponse.response_id,
          attribute: 'open_ended',
          value: response.open_ended
        });
      }
      if (response.likert !== undefined) {
        attributes.push({
          response_id: insertedResponse.response_id,
          attribute: 'likert',
          value: response.likert.toString()
        });
      }

      if (attributes.length > 0) {
        const { error: attributeError } = await supabaseClient
          .from('response_attributes')
          .insert(attributes);

        if (attributeError) throw new Error(`Failed to insert attributes: ${attributeError.message}`);
      }

      // Delay between requests
      if (i < requestBody.hive_size - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Mark as completed
    await supabaseClient
      .from('queries')
      .update({ execution_status: 'completed' })
      .eq('query_id', requestBody.query_id);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    // Update query status to error
    await supabaseClient
      .from('queries')
      .update({ 
        execution_status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('query_id', requestBody.query_id);

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500 }
    );
  }
}