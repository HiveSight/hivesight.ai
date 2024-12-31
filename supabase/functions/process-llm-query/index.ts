// supabase/functions/process-llm-query/index.ts

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleRequest } from './handler.ts';

Deno.serve(async (req: Request) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY not set' }), 
      { status: 500 }
    );
  }

  return handleRequest(req, {
    supabaseClient,
    fetch,
    openaiApiKey
  });
});