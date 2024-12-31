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

export function generatePrompt(prompt: string, responseTypes: string[], perspective: string) {
  let systemPrompt = `You are helping analyze a question from different perspectives. `;
  
  if (perspective === 'sample_americans') {
    systemPrompt += `Respond as a typical American with the provided demographic information. `;
  }
  
  let userPrompt = `Question: "${prompt}"\n\n`;
  
  if (responseTypes.includes('open_ended') && responseTypes.includes('likert')) {
    userPrompt += `Please provide:\n1. A brief open-ended response (2-3 sentences)\n2. A Likert scale rating (1-5) where:\n1=Strongly Disagree\n2=Disagree\n3=Neutral\n4=Agree\n5=Strongly Agree\n\nFormat your response as:\nResponse: [Your open-ended response]\nRating: [1-5]`;
  } else if (responseTypes.includes('open_ended')) {
    userPrompt += `Please provide a brief open-ended response (2-3 sentences).`;
  } else if (responseTypes.includes('likert')) {
    userPrompt += `Please provide a Likert scale rating (1-5) where:\n1=Strongly Disagree\n2=Disagree\n3=Neutral\n4=Agree\n5=Strongly Agree\n\nFormat your response as:\nRating: [1-5]`;
  }
  
  return { systemPrompt, userPrompt };
}

export function parseResponse(content: string, responseTypes: string[]) {
  const response: { open_ended?: string; likert?: number } = {};
  
  if (responseTypes.includes('open_ended')) {
    const openEndedMatch = content.match(/Response:\s*(.+?)(?=\nRating:|$)/s);
    if (openEndedMatch) {
      response.open_ended = openEndedMatch[1].trim();
    }
  }
  
  if (responseTypes.includes('likert')) {
    const likertMatch = content.match(/Rating:\s*(\d+)/);
    if (likertMatch) {
      const rating = parseInt(likertMatch[1]);
      if (rating >= 1 && rating <= 5) {
        response.likert = rating;
      }
    }
  }
  
  return response;
}

async function handler(req: Request) {
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
      throw new Error('OPENAI_API_KEY not set');
    }

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
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',  // or gpt-3.5-turbo based on model parameter
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

      // Parse the response
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
    console.error('Error in process-llm-query:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}

// Start the server if this is not a test environment
if (import.meta.main) {
  Deno.serve(handler);
}