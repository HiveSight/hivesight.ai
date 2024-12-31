import { assertEquals } from "https://deno.land/std@0.207.0/assert/mod.ts";
import { createClient } from '@supabase/supabase-js';
import { handleRequest } from "../../functions/process-llm-query/index.ts";

Deno.test("integration - successfully processes query", async () => {
  // Mock OpenAI response
  const mockFetch = async (url: string, init?: RequestInit) => {
    if (url.includes('openai')) {
      return new Response(JSON.stringify({
        choices: [{
          message: { content: "Response: Test response\nRating: 4" }
        }]
      }));
    }
    return new Response(null, { status: 404 });
  };

  // Mock Supabase client
  const mockSupabase = {
    from: () => ({
      insert: () => Promise.resolve({ error: null }),
      update: () => ({
        eq: () => Promise.resolve({ error: null })
      })
    })
  };

  const mockRequest = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query_id: "test-id",
      prompt: "test question",
      response_types: ["open_ended", "likert"],
      hive_size: 1,
      perspective: "general_gpt",
      model: "gpt-4"
    })
  });

  const response = await handleRequest(
    mockRequest,
    { OPENAI_API_KEY: "test_key" },
    {
      supabaseClient: mockSupabase as unknown as ReturnType<typeof createClient>,
      fetchFn: mockFetch
    }
  );

  const data = await response.json();
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertEquals(data.responses_count, 1);
});

Deno.test("integration - handles missing OpenAI key", async () => {
  const mockRequest = new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query_id: "test-id",
      prompt: "test question",
      response_types: ["open_ended"],
      hive_size: 1
    })
  });

  const response = await handleRequest(mockRequest, {});
  const data = await response.json();
  
  assertEquals(response.status, 500);
  assertEquals(data.error, "OPENAI_API_KEY not set");
});