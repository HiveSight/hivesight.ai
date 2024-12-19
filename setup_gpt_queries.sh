#!/usr/bin/env bash

set -e

# Ensure directories exist
mkdir -p supabase/sql
mkdir -p supabase/functions/process-gpt-query

# Create SQL file with gpt_queries and gpt_responses tables, policies, and triggers
cat >supabase/sql/5-gpt-queries-and-responses.sql <<'EOF'
-- Create gpt_queries table
CREATE TABLE public.gpt_queries (
    query_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    requester_id uuid NOT NULL,
    prompt text NOT NULL,
    model text NOT NULL,
    response_types text[] NOT NULL,
    hive_size integer NOT NULL,
    perspective text NOT NULL,
    age_range int[] NOT NULL,
    income_range int[] NOT NULL,
    status text DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.gpt_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own queries"
ON public.gpt_queries FOR SELECT
TO authenticated
USING (requester_id = auth.uid());

CREATE POLICY "Users can insert their own queries"
ON public.gpt_queries FOR INSERT
TO authenticated
WITH CHECK (requester_id = auth.uid());


-- Create gpt_responses table
CREATE TABLE public.gpt_responses (
    response_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    query_id uuid NOT NULL REFERENCES public.gpt_queries(query_id),
    question text NOT NULL,
    responses jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.gpt_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view responses of their own queries"
ON public.gpt_responses FOR SELECT
TO authenticated
USING (
  query_id IN (
    SELECT q.query_id FROM public.gpt_queries q WHERE q.requester_id = auth.uid()
  )
);

-- Trigger function to handle new gpt_query
CREATE OR REPLACE FUNCTION public.handle_new_gpt_query()
RETURNS trigger AS $$
DECLARE
    service_role_key TEXT;
    pgnet_id INTEGER;
    http_status INTEGER;
    required_credits integer := 1; -- Adjust credit cost as needed
BEGIN
    -- Check credits
    IF NOT public.check_sufficient_credits(NEW.requester_id, required_credits) THEN
        UPDATE public.gpt_queries SET status = 'insufficient credits' WHERE query_id = NEW.query_id;
        RETURN NEW;
    END IF;

    -- Consume credits
    IF NOT public.consume_credits(NEW.requester_id, required_credits) THEN
        UPDATE public.gpt_queries SET status = 'insufficient credits' WHERE query_id = NEW.query_id;
        RETURN NEW;
    END IF;

    UPDATE public.gpt_queries SET status = 'processing' WHERE query_id = NEW.query_id;

    SELECT decrypted_secret
    INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';

    SELECT INTO pgnet_id net.http_post(
        url := 'https://<your-supabase-project>.supabase.co/functions/v1/process-gpt-query'::text,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
            'query_id', NEW.query_id,
            'requester_id', NEW.requester_id,
            'prompt', NEW.prompt,
            'model', NEW.model,
            'response_types', NEW.response_types,
            'hive_size', NEW.hive_size,
            'perspective', NEW.perspective,
            'age_range', NEW.age_range,
            'income_range', NEW.income_range
        )
    );

    SELECT status_code
    INTO http_status
    FROM net._http_response
    WHERE id = pgnet_id;

    IF http_status != 200 THEN
        -- Refund credits if error
        PERFORM public.refund_credits(NEW.requester_id, required_credits, NULL);
        UPDATE public.gpt_queries SET status = 'error' WHERE query_id = NEW.query_id;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_gpt_query_created
AFTER INSERT ON public.gpt_queries
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_gpt_query();
EOF

# Create Edge Function file for process-gpt-query
cat >supabase/functions/process-gpt-query/index.ts <<'EOF'
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
EOF

echo "New tables, triggers, and edge function files created successfully."
echo "Please review and adjust the Edge Function code for calling OpenAI and processing responses."
