// supabase/functions/process-llm-query/handler.ts
export async function handleRequest(
    req: Request,
    dependencies: Dependencies
  ): Promise<Response> {
    try {
      const { supabaseClient, fetch, openaiApiKey } = dependencies;
      const params = await validateRequestBody(req);
      
      // Update status to processing
      await supabaseClient
        .from('queries')
        .update({ execution_status: 'processing' })
        .eq('query_id', params.query_id);
  
      // Create a respondent for this perspective
      // In a real implementation, you might want to select from existing respondents
      const { data: respondent, error: respondentError } = await supabaseClient
        .from('respondents')
        .insert({
          creator_id: params.requester_id,
          source: 'gpt',
          GESTFIPS: 0,  // Default value, could be randomized
          PRTAGE: Math.floor(Math.random() * (params.age_range[1] - params.age_range[0]) + params.age_range[0])
        })
        .select()
        .single();
  
      if (respondentError) {
        throw new Error(`Failed to create respondent: ${respondentError.message}`);
      }
  
      // Generate and store responses one at a time
      for (let i = 0; i < params.hive_size; i++) {
        const response = await generateSingleResponse(params, {
          openaiApiKey,
          fetch
        });
  
      // First insert the base response
      const { data: insertedResponse, error: responseError } = await supabaseClient
        .from('responses')
        .insert({
            query_id: params.query_id,
            respondent_id: respondent.respondent_id,
            response_text: '', // Empty since we store in attributes
            iteration: 0
        })
        .select()
        .single();

        if (responseError) {
        throw new Error(`Failed to insert response: ${responseError.message}`);
        }

        // Insert both open-ended and likert responses as attributes
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

        if (attributeError) {
            throw new Error(`Failed to insert response attributes: ${attributeError.message}`);
        }
        }
  
        // Small delay between requests to avoid rate limiting
        if (i < params.hive_size - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
  
      // Mark query as completed
      await supabaseClient
        .from('queries')
        .update({ execution_status: 'completed' })
        .eq('query_id', params.query_id);
  
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200 }
      );
    } catch (error) {
      // Update query status to error
      await supabaseClient
        .from('queries')
        .update({ 
          execution_status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('query_id', params.query_id);
  
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500 }
      );
    }
  }