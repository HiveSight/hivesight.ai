import { assertEquals } from "https://deno.land/std@0.207.0/assert/mod.ts";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { handleRequest } from "../../functions/process-llm-query/handler.ts";
import { Dependencies } from "../../functions/process-llm-query/types.ts";

Deno.test("successfully processes query", async () => {
  // Mock OpenAI response
  const mockFetch: Dependencies['fetch'] = async (input, init?) => {
    const url = input.toString();
    if (url.includes('openai')) {
      return new Response(JSON.stringify({
        choices: [{
          message: { content: "Response: Test response\nRating: 4" }
        }]
      }), { status: 200 });
    }
    return new Response(null, { status: 404 });
  };

  // Mock Supabase client with chained methods
  const mockSupabase = {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ 
            data: { respondent_id: 'test-id', response_id: 'test-response-id' }, 
            error: null 
          })
        })
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null })
      }),
      select: () => ({
        single: () => Promise.resolve({ 
          data: { respondent_id: 'test-id', response_id: 'test-response-id' }, 
          error: null 
        })
      })
    })
  } as unknown as SupabaseClient;

  const mockRequest = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query_id: "test-id",
      requester_id: "test-user",
      prompt: "test question",
      response_types: ["open_ended", "likert"],
      hive_size: 1,
      perspective: "general_gpt",
      model: "gpt-4",
      age_range: [18, 65],
      income_range: [0, 100000]
    })
  });

  const response = await handleRequest(mockRequest, {
    supabaseClient: mockSupabase,
    fetch: mockFetch,
    openaiApiKey: "test_key"
  });

  const data = await response.json();
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
});

Deno.test("handles invalid request body", async () => {
  const mockRequest = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "invalid json"
  });

  const response = await handleRequest(mockRequest, {
    supabaseClient: {} as SupabaseClient,
    fetch: () => Promise.resolve(new Response()),
    openaiApiKey: "test_key"
  });

  assertEquals(response.status, 400);
  const data = await response.json();
  assertEquals(data.error, "Invalid request body");
});

Deno.test("handles OpenAI error", async () => {
  const mockSupabase = {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ 
            data: { respondent_id: 'test-id' }, 
            error: null 
          })
        })
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null })
      })
    })
  } as unknown as SupabaseClient;

  const mockFetch: Dependencies['fetch'] = async (input, init?) => {
    if (input.toString().includes('openai')) {
      return new Response(
        JSON.stringify({
          error: {
            message: "The model 'test-model' does not exist",
            type: "invalid_request_error",
            code: "model_not_found"
          }
        }),
        { status: 404 }
      );
    }
    return new Response(null, { status: 404 });
  };

  const mockRequest = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query_id: "test-id",
      requester_id: "test-user",
      prompt: "test",
      response_types: ["open_ended"],
      hive_size: 1,
      perspective: "general_gpt",
      model: "test-model",
      age_range: [18, 65],
      income_range: [0, 100000]
    })
  });

  const response = await handleRequest(mockRequest, {
    supabaseClient: mockSupabase,
    fetch: mockFetch,
    openaiApiKey: "test_key"
  });

  assertEquals(response.status, 500);
  const data = await response.json();
  assertEquals(
    data.error,
    "OpenAI API error: The model 'test-model' does not exist"
  );
});